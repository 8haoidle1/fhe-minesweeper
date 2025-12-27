import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ABI } from '../utils/contract';
import { CONTRACT_ADDRESS, TOTAL_CELLS, GameState, CELL_HIDDEN, CELL_PENDING } from '../utils/constants';
import { useFhevm } from './useFhevm';

interface GameInfo {
  gameId: bigint | null;
  player: string;
  startTime: bigint;
  endTime: bigint;
  revealedCount: number;
  safeRevealed: number;
  state: GameState;
}

interface LeaderboardEntry {
  player: string;
  clearTime: bigint;
  timestamp: bigint;
}

export function useGame(signer: ethers.Signer | null) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [cellStates, setCellStates] = useState<number[]>(Array(TOTAL_CELLS).fill(CELL_HIDDEN));
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minesInitialized, setMinesInitialized] = useState(false);
  const [decryptStatus, setDecryptStatus] = useState<string>('');
  const { publicDecrypt, isInitializing: fhevmInitializing } = useFhevm();
  const decryptingRef = useRef(false);

  // Initialize contract
  useEffect(() => {
    if (signer && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(contractInstance);
    }
  }, [signer]);

  // Check if mines are initialized
  const checkMinesInitialized = useCallback(async () => {
    if (!contract) return;
    try {
      const initialized = await contract.minesInitialized();
      setMinesInitialized(initialized);
    } catch (err) {
      console.error('Failed to check mines:', err);
    }
  }, [contract]);

  // Check for active game
  const checkActiveGame = useCallback(async (address: string) => {
    if (!contract) return;
    try {
      const [hasActive, gameId] = await contract.hasActiveGame(address);
      if (hasActive) {
        await loadGame(gameId);
      }

      // Check for pending reveal
      const hasPending = await contract.hasPendingReveal(address);
      if (hasPending) {
        const [_, cellIndex] = await contract.getPendingReveal(address);
        setPendingCell(Number(cellIndex));
        setIsPending(true);
      }
    } catch (err) {
      console.error('Failed to check active game:', err);
    }
  }, [contract]);

  // Load game info
  const loadGame = useCallback(async (gameId: bigint) => {
    if (!contract) return;
    setIsLoading(true);
    try {
      const info = await contract.getGameInfo(gameId);
      const states = await contract.getAllCellStates(gameId);

      setGameInfo({
        gameId,
        player: info[0],
        startTime: info[1],
        endTime: info[2],
        revealedCount: Number(info[3]),
        safeRevealed: Number(info[4]),
        state: Number(info[5]) as GameState,
      });

      const statesArray = states.map((s: bigint) => Number(s));
      setCellStates(statesArray);

      // Check for pending cell
      const pendingIndex = statesArray.findIndex((s: number) => s === CELL_PENDING);
      if (pendingIndex !== -1) {
        setPendingCell(pendingIndex);
        setIsPending(true);
      } else {
        setPendingCell(null);
        setIsPending(false);
      }
    } catch (err) {
      setError('Failed to load game');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [contract]);

  // Start new game
  const startGame = useCallback(async () => {
    if (!contract) return;
    setIsLoading(true);
    setError(null);
    try {
      const tx = await contract.startGame();
      const receipt = await tx.wait();

      // Find GameStarted event
      const event = receipt.logs.find(
        (log: { fragment?: { name: string } }) => log.fragment?.name === 'GameStarted'
      );
      if (event) {
        const gameId = event.args[0];
        await loadGame(gameId);
      }
    } catch (err) {
      setError('Failed to start game');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [contract, loadGame]);

  // Request to reveal a cell and auto-decrypt
  const requestRevealCell = useCallback(async (cellIndex: number) => {
    if (!contract || !gameInfo?.gameId) return;
    if (cellStates[cellIndex] !== CELL_HIDDEN) return;
    if (isPending || decryptingRef.current) return;
    if (fhevmInitializing) {
      setError('FHEVM SDK is still initializing...');
      return;
    }

    setIsPending(true);
    setPendingCell(cellIndex);
    setError(null);
    setDecryptStatus('Requesting cell reveal...');

    try {
      // Step 1: Request reveal on-chain
      const tx = await contract.requestRevealCell(gameInfo.gameId, cellIndex);
      setDecryptStatus('Waiting for transaction confirmation...');
      const receipt = await tx.wait();

      // Update local state to show pending
      setCellStates(prev => {
        const newStates = [...prev];
        newStates[cellIndex] = CELL_PENDING;
        return newStates;
      });

      // Get handle from event
      const event = receipt.logs.find(
        (log: { fragment?: { name: string } }) => log.fragment?.name === 'CellRevealRequested'
      );

      if (!event || !event.args) {
        throw new Error('CellRevealRequested event not found');
      }

      const handle = event.args[3] as string; // 4th argument is handle
      console.log('Got handle:', handle);

      // Step 2: Wait for KMS to process and call publicDecrypt
      setDecryptStatus('Waiting for Zama KMS decryption (this may take ~30s)...');
      decryptingRef.current = true;

      // Poll for decryption result with retries
      let decryptResult = null;
      let attempts = 0;
      const maxAttempts = 20; // ~60 seconds total

      while (!decryptResult && attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between attempts
          setDecryptStatus(`Polling for decryption result (attempt ${attempts + 1}/${maxAttempts})...`);
          decryptResult = await publicDecrypt([handle]);
          console.log('Decrypt result:', decryptResult);
        } catch (err) {
          console.log('Decrypt attempt failed, retrying...', err);
          attempts++;
        }
      }

      if (!decryptResult) {
        throw new Error('Decryption timed out after 60 seconds');
      }

      // Step 3: Complete reveal with proof
      setDecryptStatus('Completing reveal on-chain...');
      const isMine = decryptResult.clearValues[handle as `0x${string}`] as boolean;
      const proof = decryptResult.decryptionProof;

      const completeTx = await contract.completeReveal(isMine, proof);
      await completeTx.wait();

      // Reload game state
      await loadGame(gameInfo.gameId);
      setDecryptStatus('');

    } catch (err) {
      setError('Failed to reveal cell: ' + (err as Error).message);
      console.error(err);
    } finally {
      setPendingCell(null);
      setIsPending(false);
      decryptingRef.current = false;
      setDecryptStatus('');
    }
  }, [contract, gameInfo, cellStates, isPending, fhevmInitializing, publicDecrypt, loadGame]);

  // Complete the reveal with decryption proof (Step 3 of async decryption)
  const completeReveal = useCallback(async (isMine: boolean, decryptionProof: string) => {
    if (!contract || !gameInfo?.gameId) return;
    if (!isPending) return;

    setError(null);
    try {
      const tx = await contract.completeReveal(isMine, decryptionProof);
      await tx.wait();

      // Reload game state
      await loadGame(gameInfo.gameId);
      setIsPending(false);
      setPendingCell(null);
    } catch (err) {
      setError('Failed to complete reveal');
      console.error(err);
    }
  }, [contract, gameInfo, isPending, loadGame]);

  // Cancel pending reveal
  const cancelReveal = useCallback(async () => {
    if (!contract || !isPending) return;

    try {
      const tx = await contract.cancelReveal();
      await tx.wait();

      if (gameInfo?.gameId) {
        await loadGame(gameInfo.gameId);
      }
      setIsPending(false);
      setPendingCell(null);
    } catch (err) {
      setError('Failed to cancel reveal');
      console.error(err);
    }
  }, [contract, gameInfo, isPending, loadGame]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (!contract) return;
    try {
      const entries = await contract.getTopLeaderboard(10);
      setLeaderboard(entries.map((e: [string, bigint, bigint]) => ({
        player: e[0],
        clearTime: e[1],
        timestamp: e[2],
      })));
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  }, [contract]);

  // Reset game state
  const resetGame = useCallback(() => {
    setGameInfo(null);
    setCellStates(Array(TOTAL_CELLS).fill(CELL_HIDDEN));
    setError(null);
    setIsPending(false);
    setPendingCell(null);
  }, []);

  // Initial load
  useEffect(() => {
    if (contract) {
      checkMinesInitialized();
      loadLeaderboard();
    }
  }, [contract, checkMinesInitialized, loadLeaderboard]);

  return {
    gameInfo,
    cellStates,
    leaderboard,
    isLoading,
    isPending,
    pendingCell,
    error,
    minesInitialized,
    decryptStatus,
    fhevmInitializing,
    startGame,
    requestRevealCell,
    completeReveal,
    cancelReveal,
    resetGame,
    checkActiveGame,
    loadLeaderboard,
    loadGame,
  };
}
