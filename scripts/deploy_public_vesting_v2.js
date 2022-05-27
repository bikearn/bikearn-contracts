const { ethers, network } = require("hardhat");
const { deployUrl } = require('../utils')
const fs = require('fs')

const main = async () => {
    let addresses = JSON.parse(fs.readFileSync(`${network.name}_address.json`))
    const signers = await ethers.getSigners()

    const Vesting = (await ethers.getContractFactory("PublicVestingV2")).connect(signers[1])
    const vesting = await Vesting.deploy(
        addresses.rteAddress,
        addresses.publicVestingAddress,
        1653465600, // start time
        1653658200, // claim time
        1658793600, // cliff time
    )
    await vesting.deployed()

    addresses.publicVestingV2Address = vesting.address
    fs.writeFileSync(
        `${network.name}_address.json`,
        JSON.stringify(addresses, null, 4)
    )
    deployUrl(network.name, vesting.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
