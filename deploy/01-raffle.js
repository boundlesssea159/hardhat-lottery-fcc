const { ethers, network } = require("hardhat")
const { networkConfig } = require("../config.helper.js")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const deployer = (await getNamedAccounts()).deployer

    let coordinatorV2Mock, coordinatorMockAdress, subscriptionId
    const networkName = network.name
    if (networkName == "hardhat" || networkName == "localhost") {
        log("deploy raffle in hardhat")
        const deploymentInfo = await deployments.get("VRFCoordinatorV2Mock")
        coordinatorV2Mock = await ethers.getContractAt(deploymentInfo.abi, deploymentInfo.address)
        // const coordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        coordinatorMockAdress = deploymentInfo.address
        // just bind a linstener on SubscriptionCreated event
        const promise = new Promise((resolove) => {
            coordinatorV2Mock.on("SubscriptionCreated", (subId) => {
                subscriptionId = subId
                resolove()
            })
        })
        // trigger the SubscriptionCreated event
        await coordinatorV2Mock.createSubscription()
        // wait receiving the SubscriptionCreated event and execute the callback function
        await promise
        // fund some eth to coordinator, otherwise the request will fail
        await coordinatorV2Mock.fundSubscription(subscriptionId, ethers.parseEther("20"))
    } else {
        coordinatorMockAdress = networkConfig[networkName]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[networkName]["subscriptionId"]
    }
    const raffle = await deploy("Raffle", {
        from: deployer,
        log: true,
        args: [
            coordinatorMockAdress,
            networkConfig[networkName]["entranceFee"],
            networkConfig[networkName]["gasLane"],
            subscriptionId,
            networkConfig[networkName]["callbackGasLimit"],
            networkConfig[networkName]["interval"],
        ],
    })

    log("deploy Raffle Success! Address:", raffle.address)
}

module.exports.tags = ["all", "raffle"]
