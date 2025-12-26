// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { FHE, euint8, ebool, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title FHEMinesweeper
 * @notice Privacy-preserving on-chain Minesweeper game using FHE
 * @dev Mine positions are encrypted - no one can see them until revealed
 *      Uses async decryption pattern with makePubliclyDecryptable + checkSignatures
 */
contract FHEMinesweeper is ZamaEthereumConfig {
    // Game configuration
    uint8 public constant GRID_SIZE = 5; // 5x5 grid
    uint8 public constant TOTAL_CELLS = 25;
    uint8 public constant MINE_COUNT = 5;

    // Cell states
    uint8 public constant CELL_HIDDEN = 0;
    uint8 public constant CELL_REVEALED_SAFE = 1;
    uint8 public constant CELL_REVEALED_MINE = 2;
    uint8 public constant CELL_PENDING = 3; // Waiting for decryption

    // Game states
    enum GameState { INACTIVE, ACTIVE, WON, LOST }

    struct Game {
        address player;
        uint256 startTime;
        uint256 endTime;
        uint8 revealedCount;
        uint8 safeRevealed;
        GameState state;
        mapping(uint8 => uint8) cellStates; // 0=hidden, 1=safe, 2=mine, 3=pending
    }

    // Pending reveal request
    struct RevealRequest {
        uint256 gameId;
        uint8 cellIndex;
        ebool encryptedValue;
        bool pending;
    }

    // Encrypted mine grid (shared across all games)
    // Each cell stores encrypted 1 if mine, 0 if safe
    mapping(uint8 => ebool) private encryptedMines;

    // Games mapping
    mapping(uint256 => Game) public games;
    uint256 public gameCounter;

    // Pending reveal requests: player => request
    mapping(address => RevealRequest) public pendingReveals;

    // Leaderboard
    struct LeaderboardEntry {
        address player;
        uint256 clearTime;
        uint256 timestamp;
    }
    LeaderboardEntry[] public leaderboard;

    // Events
    event GameStarted(uint256 indexed gameId, address indexed player);
    event CellRevealRequested(uint256 indexed gameId, uint8 cellIndex, address indexed player);
    event CellRevealed(uint256 indexed gameId, uint8 cellIndex, bool isMine);
    event GameWon(uint256 indexed gameId, address indexed player, uint256 clearTime);
    event GameLost(uint256 indexed gameId, address indexed player);
    event MinesInitialized();

    // Errors
    error GameNotActive();
    error NotYourGame();
    error CellAlreadyRevealed();
    error InvalidCellIndex();
    error MinesNotInitialized();
    error RevealAlreadyPending();
    error NoRevealPending();
    error InvalidProof();

    bool public minesInitialized;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Initialize the mine grid with encrypted values
     * @dev Only owner can call this. Mines are set using encrypted inputs
     * @param minePositions Array of encrypted boolean values for each cell
     * @param inputProof Zero-knowledge proof for the encrypted inputs
     */
    function initializeMines(
        externalEuint8[] calldata minePositions,
        bytes calldata inputProof
    ) external onlyOwner {
        require(minePositions.length == TOTAL_CELLS, "Invalid mine positions length");
        require(!minesInitialized, "Mines already initialized");

        for (uint8 i = 0; i < TOTAL_CELLS; i++) {
            // Convert external encrypted input to euint8 with proof verification
            euint8 value = FHE.fromExternal(minePositions[i], inputProof);
            // Check if > 0 to get ebool (1 = mine, 0 = safe)
            encryptedMines[i] = FHE.gt(value, FHE.asEuint8(0));
            // Allow this contract to access the encrypted value
            FHE.allowThis(encryptedMines[i]);
        }

        minesInitialized = true;
        emit MinesInitialized();
    }

    /**
     * @notice Start a new game
     * @return gameId The ID of the newly created game
     */
    function startGame() external returns (uint256 gameId) {
        if (!minesInitialized) revert MinesNotInitialized();

        gameId = gameCounter++;
        Game storage game = games[gameId];
        game.player = msg.sender;
        game.startTime = block.timestamp;
        game.state = GameState.ACTIVE;
        game.revealedCount = 0;
        game.safeRevealed = 0;

        emit GameStarted(gameId, msg.sender);
    }

    /**
     * @notice Request to reveal a cell (Step 1: initiate async decryption)
     * @param gameId The game ID
     * @param cellIndex The cell to reveal (0-24)
     */
    function requestRevealCell(uint256 gameId, uint8 cellIndex) external {
        Game storage game = games[gameId];

        if (game.state != GameState.ACTIVE) revert GameNotActive();
        if (game.player != msg.sender) revert NotYourGame();
        if (cellIndex >= TOTAL_CELLS) revert InvalidCellIndex();
        if (game.cellStates[cellIndex] != CELL_HIDDEN) revert CellAlreadyRevealed();
        if (pendingReveals[msg.sender].pending) revert RevealAlreadyPending();

        // Get the encrypted mine value for this cell
        ebool isMineEncrypted = encryptedMines[cellIndex];

        // Store pending reveal request
        pendingReveals[msg.sender] = RevealRequest({
            gameId: gameId,
            cellIndex: cellIndex,
            encryptedValue: isMineEncrypted,
            pending: true
        });

        // Mark cell as pending
        game.cellStates[cellIndex] = CELL_PENDING;

        // Mark the encrypted value as publicly decryptable
        FHE.makePubliclyDecryptable(isMineEncrypted);

        emit CellRevealRequested(gameId, cellIndex, msg.sender);
    }

    /**
     * @notice Complete the reveal with decrypted value (Step 3: verify and process)
     * @param isMine The decrypted boolean value
     * @param decryptionProof The KMS signature proof
     */
    function completeReveal(bool isMine, bytes calldata decryptionProof) external {
        RevealRequest storage request = pendingReveals[msg.sender];
        if (!request.pending) revert NoRevealPending();

        // Verify the decryption proof
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = ebool.unwrap(request.encryptedValue);
        FHE.checkSignatures(handles, abi.encode(isMine), decryptionProof);

        Game storage game = games[request.gameId];
        uint8 cellIndex = request.cellIndex;

        // Clear pending request
        request.pending = false;

        game.revealedCount++;

        if (isMine) {
            game.cellStates[cellIndex] = CELL_REVEALED_MINE;
            game.state = GameState.LOST;
            game.endTime = block.timestamp;
            emit CellRevealed(request.gameId, cellIndex, true);
            emit GameLost(request.gameId, msg.sender);
        } else {
            game.cellStates[cellIndex] = CELL_REVEALED_SAFE;
            game.safeRevealed++;
            emit CellRevealed(request.gameId, cellIndex, false);

            // Check win condition (revealed all safe cells)
            if (game.safeRevealed == TOTAL_CELLS - MINE_COUNT) {
                game.state = GameState.WON;
                game.endTime = block.timestamp;
                uint256 clearTime = game.endTime - game.startTime;

                // Add to leaderboard
                leaderboard.push(LeaderboardEntry({
                    player: msg.sender,
                    clearTime: clearTime,
                    timestamp: block.timestamp
                }));

                emit GameWon(request.gameId, msg.sender, clearTime);
            }
        }
    }

    /**
     * @notice Cancel a pending reveal request
     */
    function cancelReveal() external {
        RevealRequest storage request = pendingReveals[msg.sender];
        if (!request.pending) revert NoRevealPending();

        Game storage game = games[request.gameId];
        game.cellStates[request.cellIndex] = CELL_HIDDEN;

        request.pending = false;
    }

    /**
     * @notice Get the state of a specific cell in a game
     * @param gameId The game ID
     * @param cellIndex The cell index
     * @return Cell state (0=hidden, 1=safe, 2=mine, 3=pending)
     */
    function getCellState(uint256 gameId, uint8 cellIndex) external view returns (uint8) {
        return games[gameId].cellStates[cellIndex];
    }

    /**
     * @notice Get all cell states for a game
     * @param gameId The game ID
     * @return states Array of cell states
     */
    function getAllCellStates(uint256 gameId) external view returns (uint8[25] memory states) {
        for (uint8 i = 0; i < TOTAL_CELLS; i++) {
            states[i] = games[gameId].cellStates[i];
        }
    }

    /**
     * @notice Get game info
     * @param gameId The game ID
     */
    function getGameInfo(uint256 gameId) external view returns (
        address player,
        uint256 startTime,
        uint256 endTime,
        uint8 revealedCount,
        uint8 safeRevealed,
        GameState state
    ) {
        Game storage game = games[gameId];
        return (
            game.player,
            game.startTime,
            game.endTime,
            game.revealedCount,
            game.safeRevealed,
            game.state
        );
    }

    /**
     * @notice Check if player has pending reveal
     * @param player The player address
     */
    function hasPendingReveal(address player) external view returns (bool) {
        return pendingReveals[player].pending;
    }

    /**
     * @notice Get pending reveal info
     * @param player The player address
     */
    function getPendingReveal(address player) external view returns (uint256 gameId, uint8 cellIndex) {
        RevealRequest storage request = pendingReveals[player];
        return (request.gameId, request.cellIndex);
    }

    /**
     * @notice Get leaderboard length
     */
    function getLeaderboardLength() external view returns (uint256) {
        return leaderboard.length;
    }

    /**
     * @notice Get top N entries from leaderboard
     * @param count Number of entries to return
     */
    function getTopLeaderboard(uint256 count) external view returns (LeaderboardEntry[] memory) {
        uint256 length = count > leaderboard.length ? leaderboard.length : count;
        LeaderboardEntry[] memory top = new LeaderboardEntry[](length);

        // Simple copy (in production, would want to sort by clearTime)
        for (uint256 i = 0; i < length; i++) {
            top[i] = leaderboard[i];
        }

        return top;
    }

    /**
     * @notice Check if player has an active game
     * @param player The player address
     */
    function hasActiveGame(address player) external view returns (bool, uint256) {
        for (uint256 i = gameCounter; i > 0; i--) {
            if (games[i - 1].player == player && games[i - 1].state == GameState.ACTIVE) {
                return (true, i - 1);
            }
        }
        return (false, 0);
    }

    /**
     * @notice Reset mines (only owner, for new rounds)
     */
    function resetMines() external onlyOwner {
        minesInitialized = false;
    }
}
