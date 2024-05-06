const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../config.helper");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("fulfillRandomWords", () => {
      it("should work with live Chainlink Keepers and Chainlink VRF", async () => {
        const contract = await ethers.getContractAt(
          "Raffle",
          networkConfig.sepolia.raffle
        );
        const singers = await ethers.getSigners();
        const deployer = singers[0];
        const enterFee = await contract.getEntranceFee();
        console.log(deployer, enterFee);
        await new Promise(async (resolve, reject) => {
          let startingBalance;
          contract.once("RaffleWinnerPicked", async (winner) => {
            try {
              console.log("Winner Picked");
              assert.equal(await raffle.getRaffleState(), "0");
              const endingBalance = await ethers.provider.getBalance(
                deployer.address
              );
              assert.isAbove(endingBalance, startingBalance);
              assert.equal(await contract.getNumOfPlayers(), 0);
              assert.equal(await contract.getBalance(), 0);
              resolve();
            } catch (error) {
              reject(error);
            }
          });

          const tx = await contract.enterRaffle({
            value: networkConfig.sepolia.entranceFee,
          });
          await tx.wait(1);
          startingBalance = await ethers.provider.getBalance(deployer.address);
          console.log("startingBalance:", startingBalance);
        });
      });
    });
