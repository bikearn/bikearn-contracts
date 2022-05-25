const { ethers, network } = require("hardhat");
const { deployUrl } = require('../utils')
const fs = require('fs')

const main = async () => {
    let addresses = JSON.parse(fs.readFileSync(`${network.name}_address.json`))
    const signers = await ethers.getSigners()

    const Vesting = (await ethers.getContractFactory("PublicVesting")).connect(signers[1])
    const vesting = await Vesting.deploy(
        addresses.rteAddress,
        addresses.busdAddress,
        "0x0F1A315d767675aAF46bbe17b7eD8F6960333300",
        1653465600, // start time
        1653562800, // close time
        1653573600, // claim time
        1658793600, // cliff time
        1653570000, // listing time
        
        /* 1653238800, // start time
        1653498000, // close time
        1653238800, // claim time
        1653498000, // cliff time
        1653238800, // listing time */
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
