import { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet';
import { useGame } from './hooks/useGame';
import { WalletButton } from './components/WalletButton';
import { GameBoard } from './components/GameBoard';
import { GameStats } from './components/GameStats';
import { GameResult } from './components/GameResult';
import { Leaderboard } from './components/Leaderboard';
import { GameState, MINE_COUNT, TOTAL_CELLS } from './utils/constants';

function App() {
  const wallet = useWallet();
  const game = useGame(wallet.signer);

  useEffect(() => {
    if (wallet.address && wallet.isCorrectNetwork) {
      game.checkActiveGame(wallet.address);
    }
  }, [wallet.address, wallet.isCorrectNetwork]);

  useEffect(() => {
    if (game.error) {
      toast.error(game.error);
    }
  }, [game.error]);

  const handleStartGame = async () => {
    if (!game.minesInitialized) {
      toast.error('Mines not initialized. Contact the game administrator.');
      return;
    }
    await game.startGame();
  };

  const handleCellClick = async (cellIndex: number) => {
    await game.requestRevealCell(cellIndex);
  };

  const handlePlayAgain = () => {
    game.resetGame();
    game.loadLeaderboard();
  };

  const isGameActive = game.gameInfo?.state === GameState.ACTIVE;
  const isGameOver = game.gameInfo?.state === GameState.WON || game.gameInfo?.state === GameState.LOST;

  return (
    <div className="min-h-screen py-8 px-4">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="text-4xl"></div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              FHE Minesweeper
            </h1>
            <p className="text-sm text-gray-400">Privacy-Preserving On-Chain Game</p>
          </div>
        </div>
        <WalletButton
          address={wallet.address}
          isConnecting={wallet.isConnecting}
          isCorrectNetwork={wallet.isCorrectNetwork}
          onConnect={wallet.connect}
          onSwitchNetwork={wallet.switchNetwork}
        />
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {/* Game Description */}
        <div className="glass rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <span className="text-2xl"></span>
              <div>
                <p className="font-medium text-white">5x5 Grid</p>
                <p>{MINE_COUNT} mines hidden using FHE encryption</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl"></span>
              <div>
                <p className="font-medium text-white">Reveal Cells</p>
                <p>Click to reveal. Avoid the mines!</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-2xl"></span>
              <div>
                <p className="font-medium text-white">Win Condition</p>
                <p>Reveal all {TOTAL_CELLS - MINE_COUNT} safe cells to win</p>
              </div>
            </div>
          </div>
        </div>

        {/* FHE Info Banner */}
        <div className="glass rounded-xl p-4 mb-6 border border-indigo-500/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl"></span>
            <div>
              <p className="text-sm text-indigo-300 font-medium">Powered by Zama FHEVM</p>
              <p className="text-xs text-gray-400">
                Mine positions are encrypted on-chain using async decryption. The contract cannot see where mines are!
              </p>
            </div>
          </div>
        </div>

        {/* Game Area */}
        {!wallet.address ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">Connect your wallet to start playing</p>
            <WalletButton
              address={wallet.address}
              isConnecting={wallet.isConnecting}
              isCorrectNetwork={wallet.isCorrectNetwork}
              onConnect={wallet.connect}
              onSwitchNetwork={wallet.switchNetwork}
            />
          </div>
        ) : !wallet.isCorrectNetwork ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-orange-400 mb-4">Please switch to Sepolia Network to play</p>
            <button
              onClick={wallet.switchNetwork}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600
                         hover:from-orange-500 hover:to-red-500
                         rounded-lg font-semibold transition-all"
            >
              Switch Network
            </button>
          </div>
        ) : !game.gameInfo ? (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">Ready to test your luck?</p>
            <button
              onClick={handleStartGame}
              disabled={game.isLoading}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600
                         hover:from-indigo-500 hover:to-purple-500
                         rounded-lg font-bold text-lg transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
            >
              {game.isLoading ? 'Starting...' : 'Start New Game'}
            </button>
          </div>
        ) : (
          <div>
            <GameStats gameInfo={game.gameInfo} />
            <div className="flex justify-center">
              <GameBoard
                cellStates={game.cellStates}
                onCellClick={handleCellClick}
                disabled={!isGameActive || game.isLoading}
                isPending={game.isPending}
                pendingCell={game.pendingCell}
              />
            </div>
            {game.isPending && (
              <div className="text-center mt-4">
                <div className="text-yellow-400 animate-pulse mb-2">
                  {game.decryptStatus || `Processing cell ${game.pendingCell}...`}
                </div>
                <p className="text-xs text-gray-500">
                  FHE decryption in progress. This may take up to 60 seconds.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Game Result Modal */}
        {isGameOver && (
          <GameResult
            state={game.gameInfo!.state}
            clearTime={
              game.gameInfo!.state === GameState.WON
                ? Number(game.gameInfo!.endTime - game.gameInfo!.startTime)
                : undefined
            }
            onPlayAgain={handlePlayAgain}
          />
        )}

        {/* Leaderboard */}
        <Leaderboard entries={game.leaderboard} />

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Built with Zama FHEVM for the Zama Developer Program</p>
          <p className="mt-1">
            <a
              href="https://docs.zama.org/fhevm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Learn more about FHE
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
