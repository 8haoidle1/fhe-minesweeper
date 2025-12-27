// Contract configuration
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Network configuration for Ethereum Sepolia (Zama FHEVM on Sepolia)
export const ZAMA_CHAIN_ID = 11155111; // Sepolia chain ID
export const ZAMA_RPC_URL = "https://rpc.sepolia.org";
export const ZAMA_CHAIN_NAME = "Ethereum Sepolia";

export const NETWORK_CONFIG = {
  chainId: `0x${ZAMA_CHAIN_ID.toString(16)}`,
  chainName: ZAMA_CHAIN_NAME,
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: [ZAMA_RPC_URL],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

// Game constants
export const GRID_SIZE = 5;
export const TOTAL_CELLS = 25;
export const MINE_COUNT = 5;

// Cell states
export const CELL_HIDDEN = 0;
export const CELL_REVEALED_SAFE = 1;
export const CELL_REVEALED_MINE = 2;
export const CELL_PENDING = 3;

// Game states
export enum GameState {
  INACTIVE = 0,
  ACTIVE = 1,
  WON = 2,
  LOST = 3,
}
