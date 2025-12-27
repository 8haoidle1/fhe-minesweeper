import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x05d45F23bA1F08053eC259e6d0D156624Ee5E208";

  const [deployer] = await ethers.getSigners();
  console.log("Initializing mines with account:", deployer.address);

  const FHEMinesweeper = await ethers.getContractAt("FHEMinesweeper", contractAddress);

  console.log("Calling initializeMines()...");
  const tx = await FHEMinesweeper.initializeMines();
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt?.blockNumber);

  const initialized = await FHEMinesweeper.minesInitialized();
  console.log("Mines initialized:", initialized);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
