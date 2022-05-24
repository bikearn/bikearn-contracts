const { ethers, network } = require("hardhat");
const { deployUrl } = require('../utils')
const fs = require('fs')

const main = async () => {
    let addresses = JSON.parse(fs.readFileSync(`${network.name}_address.json`))

    const Vesting = await ethers.getContractFactory("PrivateVesting")
    const vesting = await Vesting.deploy(
        addresses.rteAddress,
        addresses.busdAddress,
        "0x1a1a022f208ccb1b3f2d619d8fafcdf093190db4",
        /* 1653447600, // start time
        1653478200, // close time
        1653498000, // claim time
        1661472000, // cliff time */
        
        1653238800, // start time
        1653498000, // close time
        1653238800, // claim time
        1653498000, // cliff time
    )
    await vesting.deployed()

    addresses.privateVestingAddress = vesting.address
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
