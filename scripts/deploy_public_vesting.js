const { ethers, network } = require("hardhat");
const { deployUrl } = require('../utils')
const fs = require('fs')

const main = async () => {
    let addresses = JSON.parse(fs.readFileSync(`${network.name}_address.json`))

    const Vesting = await ethers.getContractFactory("PublicVesting")
    const vesting = await Vesting.deploy(
        addresses.rteAddress,
        addresses.busdAddress,
        /* 1653465600, // start time
        1653562800, // close time
        1653573600, // claim time
        1658793600, // cliff time
        1653570000, // listing time */
        
        1653238800, // start time
        1653498000, // close time
        1653238800, // claim time
        1653498000, // cliff time
        1653238800, // listing time
    )
    await vesting.deployed()

    addresses.publicVestingAddress = vesting.address
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
