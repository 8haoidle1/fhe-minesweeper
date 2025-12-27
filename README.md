# FHE Minesweeper

Privacy-preserving on-chain Minesweeper game powered by [Zama FHEVM](https://docs.zama.org/fhevm).

## Live Demo

- **Play Now**: [https://cipher-mines.vercel.app](https://cipher-mines.vercel.app)
- **Contract (Sepolia)**: [0x63aF56Fd02D67a1c1D6c235cAE0BD5879ea8340C](https://sepolia.etherscan.io/address/0x63aF56Fd02D67a1c1D6c235cAE0BD5879ea8340C#code)

## Overview

FHE Minesweeper brings the classic Minesweeper game to the blockchain with true privacy guarantees using Fully Homomorphic Encryption (FHE). Mine positions are encrypted on-chain, and even the smart contract cannot see where the mines are until a player reveals a cell.

### Key Features

- **Encrypted Mine Positions**: Mine locations are stored as FHE-encrypted booleans (`ebool`)
- **Async Decryption Pattern**: Uses `FHE.makePubliclyDecryptable()` + `FHE.checkSignatures()` for secure reveals
- **Competitive Leaderboard**: Fastest clear times are recorded on-chain
- **5x5 Grid**: 25 cells with 5 hidden mines
- **Win Condition**: Reveal all 20 safe cells without hitting a mine

## Technical Architecture

### Smart Contract

The `FHEMinesweeper.sol` contract inherits from `ZamaEthereumConfig` and uses the latest FHEVM patterns:

```solidity
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { FHE, euint8, ebool, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";

contract FHEMinesweeper is ZamaEthereumConfig {
    mapping(uint8 => ebool) private encryptedMines;
    // ...
}
```

### Game Flow

1. **Owner initializes mines** with encrypted values and ZKP proof
2. **Player starts a game** - creates new game session
3. **Player requests cell reveal** - triggers async decryption via `FHE.makePubliclyDecryptable()`
4. **Off-chain decryption** - Zama relayer decrypts and generates proof
5. **Player completes reveal** - submits decrypted value with KMS signature proof
6. **Contract verifies** - `FHE.checkSignatures()` validates and updates game state

### FHE Operations Used

| Operation | Description |
|-----------|-------------|
| `FHE.randEuint8()` | Generates on-chain encrypted random uint8 |
| `FHE.lt()` | Less-than comparison on encrypted values |
| `FHE.asEuint8()` | Creates encrypted uint8 from plaintext |
| `FHE.asEbool()` | Creates encrypted boolean from plaintext |
| `FHE.allowThis()` | Grants contract access to encrypted value |
| `FHE.makePubliclyDecryptable()` | Marks ciphertext for public decryption |
| `FHE.checkSignatures()` | Verifies KMS decryption proof |

## Technology Stack

### Smart Contracts
- **Solidity**: ^0.8.24
- **@fhevm/solidity**: 0.9.1
- **@fhevm/hardhat-plugin**: 0.3.0-3
- **@zama-fhe/relayer-sdk**: 0.3.0-8
- **Hardhat**: ^2.26.0

### Frontend
- **React**: ^18.3.1
- **TypeScript**: ^5.8.3
- **ethers.js**: ^6.15.0
- **Vite**: ^6.0.5
- **Tailwind CSS**: ^3.4.17

## Project Structure

```
fhe-minesweeper/
├── contracts/
│   └── FHEMinesweeper.sol     # Main game contract
├── deploy/
│   └── 001_deploy_minesweeper.ts
├── test/
│   └── FHEMinesweeper.test.ts
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   └── utils/             # Constants and ABI
│   └── package.json
├── hardhat.config.ts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 7.0.0

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fhe-minesweeper

# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### Configuration

1. Copy `.env.example` to `.env` and configure:
```bash
MNEMONIC="your wallet mnemonic"
INFURA_API_KEY="your infura key"  # Optional
```

2. For frontend, copy `frontend/.env.example` to `frontend/.env`:
```bash
VITE_CONTRACT_ADDRESS=0x...  # Deployed contract address
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy to Zama Network

```bash
npm run deploy:zama
```

### Run Frontend

```bash
cd frontend
npm run dev
```

## Network Configuration

### Ethereum Sepolia (Zama FHEVM)
- **RPC URL**: https://ethereum-sepolia-rpc.publicnode.com
- **Chain ID**: 11155111
- **Explorer**: https://sepolia.etherscan.io
- **Deployed Contract**: `0x63aF56Fd02D67a1c1D6c235cAE0BD5879ea8340C`

## How the FHE Privacy Works

1. **Mine Initialization**: The contract owner calls `initializeMines()` which uses `FHE.randEuint8()` to generate on-chain encrypted random values. Each cell stores an encrypted boolean (`ebool`) indicating whether it contains a mine.

2. **During Gameplay**: When a player clicks a cell, the contract:
   - Retrieves the encrypted mine status (`ebool`)
   - Calls `FHE.makePubliclyDecryptable()` to mark it for decryption
   - Frontend uses Zama Relayer SDK to poll for decryption result

3. **Verification**: The player submits the decrypted boolean with a KMS signature. The contract calls `FHE.checkSignatures()` to verify the proof before updating the game state.

4. **Privacy Guarantee**: At no point can anyone (including the contract) see other mine positions. Only the revealed cell's status becomes known.

## Contract Functions

| Function | Description |
|----------|-------------|
| `initializeMines()` | Owner sets encrypted mine positions |
| `startGame()` | Begin a new game session |
| `requestRevealCell()` | Initiate cell reveal (async) |
| `completeReveal()` | Submit decrypted value with proof |
| `cancelReveal()` | Cancel pending reveal |
| `getGameInfo()` | Get current game state |
| `getTopLeaderboard()` | Get top winning times |

## Security Considerations

- Mine positions cannot be front-run or predicted
- KMS signature verification prevents forged decryption results
- Access control ensures only the game owner can initialize mines
- Pending reveal state prevents duplicate reveal requests

## License

BSD-3-Clause-Clear

## Acknowledgments

Built with [Zama FHEVM](https://www.zama.org/) for the Zama Developer Program.

## Resources

- [Zama FHEVM Documentation](https://docs.zama.org/fhevm)
- [Zama Developer Program](https://www.zama.org/developer-program)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
