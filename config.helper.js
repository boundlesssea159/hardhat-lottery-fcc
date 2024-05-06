const { ethers } = require("hardhat");

const networkConfig = {
  hardhat: {
    chainId: 31337,
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    entranceFee: ethers.parseEther("0.01"),
    callbackGasLimit: 500000,
    interval: 30,
  },
  localhost: {
    chainId: 31337,
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    entranceFee: ethers.parseEther("0.01"),
    callbackGasLimit: 500000,
    interval: 30,
  },
  sepolia: {
    chainId: 11155111,
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    entranceFee: ethers.parseEther("0.01"),
    subscriptionId: 11388,
    callbackGasLimit: 500000,
    interval: 30,
    vrfCoordinatorV2: "0x8103b0a8a00be2ddc778e6e7eaa21791cd364625",
    raffle: "0x3861bbad13d9eab41c5377fb15f772712d374957",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = { networkConfig, developmentChains };
