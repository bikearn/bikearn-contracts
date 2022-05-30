const { ethers, upgrades, network } = require('hardhat')
const fs = require('fs')
const { deployUrl } = require('../utils')

const deploy = async () => {
    let addresses = JSON.parse(fs.readFileSync(`${network.name}_address.json`))
    const signers = await ethers.getSigners()

    const Marketplace = await ethers.getContractFactory('Marketplace')
    const market = await Marketplace.deploy(
        addresses.rteAddress,
        addresses.bikeAddress,
        signers[0].address
    )
    await market.deployed()

    addresses.marketAddress = market.address
    fs.writeFileSync(
        `${network.name}_address.json`,
        JSON.stringify(addresses, null, 4)
    )

    deployUrl(network.name, market.address)
}

deploy()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })

