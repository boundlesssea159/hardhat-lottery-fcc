const { assert, expect } = require("chai");
const { deployments, ethers, network, getNamedAccounts } = require("hardhat");
const { networkConfig } = require("../../config.helper");

describe("Raffle", async () => {
  let coordinator, raffle, entranceFee, deployer, interval;
  beforeEach(async () => {
    await deployments.fixture(["all"]);
    const coordinatorInfo = await deployments.get("VRFCoordinatorV2Mock");
    coordinator = await ethers.getContractAt(
      coordinatorInfo.abi,
      coordinatorInfo.address
    );
    const raffleInfo = await deployments.get("Raffle");
    raffle = await ethers.getContractAt(raffleInfo.abi, raffleInfo.address);
    const subId = await raffle.getSubScriptionId();
    await coordinator.addConsumer(subId, raffle.target);
    entranceFee = await raffle.getEntranceFee();
    deployer = (await getNamedAccounts()).deployer;
    interval = await raffle.getInterval();
  });

  describe("construcotr", () => {
    it("should init constructor paramaters", async () => {
      //   const { coordinator, raffle } = await loadFixture(deploy);
      const state = await raffle.getRaffleState();
      assert.equal(state, 0);
      assert.equal(
        await raffle.getEntranceFee().Number,
        networkConfig[network.name]["entranceFee"].Number
      );
      assert.equal(await raffle.getCoordinator(), coordinator.target);
    });
  });

  describe("enterFaffle", () => {
    it("should revert if don't send enough ETH", async () => {
      await expect(
        raffle.enterRaffle({ value: ethers.parseEther("0.0000001") })
      ).to.be.rejectedWith("Raffle_SendMoreToEnterRaffle");
    });
    it("should record players", async () => {
      await raffle.enterRaffle({ value: entranceFee });
      assert.equal(await raffle.getPlayers(0), deployer);
    });
    it("should emit event", async () => {
      const response = await raffle.enterRaffle({ value: entranceFee });
      await response.wait(1);
      await expect(response).to.emit(raffle, "RaffleEnter");
    });

    it("should doesn't allow player to enter when raffle state is calculating", async () => {
      await raffle.enterRaffle({ value: entranceFee });
      // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
      await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
      await network.provider.request({ method: "evm_mine", params: [] });
      // we pretend to be a keeper for a second
      await raffle.performUpkeep("0x"); // changes the state to calculating for our comparison below
      await expect(
        raffle.enterRaffle({ value: entranceFee })
      ).to.be.rejectedWith("Raffle_NotOpen");
    });
  });
  describe("checkUpkeep", () => {
    it("should return false if people haven't sent any ETH", async () => {
      await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
      await network.provider.request({ method: "evm_mine", params: [] });
      const { upkeepNeeded } = await raffle.checkUpkeep("0x");
      assert.isFalse(upkeepNeeded);
    });
    it("should return false if raffle isn't open", async () => {
      await raffle.enterRaffle({ value: entranceFee });
      await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
      await network.provider.request({ method: "evm_mine", params: [] });
      await raffle.performUpkeep("0x");
      const raffleState = await raffle.getRaffleState();
      assert.equal(raffleState.toString(), "1");
      const { upkeepNeeded } = await raffle.checkUpkeep("0x");
      assert.equal(upkeepNeeded, false);
    });
    it("should return false if enough time hasn't passed", async () => {
      await raffle.enterRaffle({ value: entranceFee });
      await network.provider.send("evm_increaseTime", [Number(interval) - 10]);
      await network.provider.request({ method: "evm_mine", params: [] });
      const { upkeepNeeded } = await raffle.checkUpkeep("0x");
      assert.isFalse(upkeepNeeded);
    });
    it("should return true if enough time passed,has players,eth,and is open", async () => {
      await raffle.enterRaffle({ value: entranceFee });
      await network.provider.send("evm_increaseTime", [Number(interval) + 10]);
      await network.provider.request({ method: "evm_mine", params: [] });
      const { upkeepNeeded } = await raffle.checkUpkeep("0x");
      assert(upkeepNeeded);
    });

    describe("fulfillRandomWords", () => {
      beforeEach(async () => {
        await raffle.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
      });
      it("can only be called after performUpkeep", async () => {
        await expect(
          coordinator.fulfillRandomWords(0, raffle.target)
        ).to.be.revertedWith("nonexistent request");
      });

      it("should pick a winner,resets the lottery, and sends money", async () => {
        // mock several people to enter the raffle
        const accounts = await ethers.getSigners();
        const beginBalance = await ethers.provider.getBalance(
          accounts[0].address
        );
        for (let i = 0; i < accounts.length; i++) {
          raffle = raffle.connect(accounts[i]);
          raffle.enterRaffle({ value: entranceFee });
        }
        // registe listener for the event
        const getRequestIdHandler = new Promise(async (resolove, reject) => {
          raffle.once("RequestedRaffleWinner", async (requestId) => {
            try {
              console.log("event has been listened");
              assert.isAbove(await raffle.getBalance(), 0);
              // transfer random to fulfillRandomWordsa
              await coordinator.fulfillRandomWords(requestId, raffle.target);
              const winner = await raffle.getWinner();
              assert.equal(await raffle.getRaffleState(), "0");
              assert.equal(await raffle.getBalance(), 0);
              const endBalance = await ethers.provider.getBalance(winner);
              assert.isTrue(endBalance > beginBalance);
              resolove();
            } catch (e) {
              reject(e);
            }
          });
        });
        // mock the chainlink node to request random
        const response = await raffle.performUpkeep("0x");
        response.wait(1);
        // execute business logic after receving random
        await getRequestIdHandler;
      });
    });
  });
});
