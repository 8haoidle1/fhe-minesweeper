import { expect } from "chai";
import { ethers } from "hardhat";

describe("FHEMinesweeper", function () {
  let minesweeper: any;
  let owner: any;
  let player1: any;
  let player2: any;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const FHEMinesweeper = await ethers.getContractFactory("FHEMinesweeper");
    minesweeper = await FHEMinesweeper.deploy();
    await minesweeper.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await minesweeper.owner()).to.equal(owner.address);
    });

    it("Should have correct grid size", async function () {
      expect(await minesweeper.GRID_SIZE()).to.equal(5);
    });

    it("Should have correct total cells", async function () {
      expect(await minesweeper.TOTAL_CELLS()).to.equal(25);
    });

    it("Should have correct mine count", async function () {
      expect(await minesweeper.MINE_COUNT()).to.equal(5);
    });

    it("Should not have mines initialized", async function () {
      expect(await minesweeper.minesInitialized()).to.equal(false);
    });
  });

  describe("Game Mechanics", function () {
    it("Should not allow starting game before mines initialized", async function () {
      await expect(minesweeper.connect(player1).startGame())
        .to.be.revertedWithCustomError(minesweeper, "MinesNotInitialized");
    });

    it("Should allow only owner to reset mines", async function () {
      await expect(minesweeper.connect(player1).resetMines())
        .to.be.revertedWith("Only owner");
    });
  });

  describe("Cell States", function () {
    it("Should have correct cell state constants", async function () {
      expect(await minesweeper.CELL_HIDDEN()).to.equal(0);
      expect(await minesweeper.CELL_REVEALED_SAFE()).to.equal(1);
      expect(await minesweeper.CELL_REVEALED_MINE()).to.equal(2);
      expect(await minesweeper.CELL_PENDING()).to.equal(3);
    });
  });

  describe("Leaderboard", function () {
    it("Should start with empty leaderboard", async function () {
      expect(await minesweeper.getLeaderboardLength()).to.equal(0);
    });

    it("Should return empty array for top leaderboard", async function () {
      const top = await minesweeper.getTopLeaderboard(10);
      expect(top.length).to.equal(0);
    });
  });

  describe("Game State", function () {
    it("Should return no active game for new player", async function () {
      const [hasActive, gameId] = await minesweeper.hasActiveGame(player1.address);
      expect(hasActive).to.equal(false);
    });

    it("Should return no pending reveal for new player", async function () {
      expect(await minesweeper.hasPendingReveal(player1.address)).to.equal(false);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to initialize mines", async function () {
      // Note: This test would need proper encrypted inputs to work fully
      // For now, we just verify access control
      await expect(minesweeper.connect(player1).initializeMines([], "0x"))
        .to.be.revertedWith("Only owner");
    });
  });
});
