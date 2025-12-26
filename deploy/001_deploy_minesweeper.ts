import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying FHEMinesweeper with account:", deployer);

  const deployment = await deploy("FHEMinesweeper", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  console.log("FHEMinesweeper deployed to:", deployment.address);
};

export default func;
func.tags = ["FHEMinesweeper"];
