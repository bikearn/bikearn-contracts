const fs = require('fs')
const { task, types } = require('hardhat/config')
const { parseEther, formatEther, UNLIMITED_ALLOWANCE, txUrl } = require('../utils')

const marketAbi =
    require('../artifacts/contracts/Marketplace.sol/Marketplace.json').abi
const busdAbi =
    require('../artifacts/contracts/RTE.sol/RTE.json').abi

task('market', '')
    .addParam('task', 'task', undefined, types.string)
    .setAction(async (args, hre) => {
        if (args.task === 'getNFT') {
            await hre.run('market-get-nfts')
        } else if (args.task === 'buy') {
            await hre.run('private-vesting-buy')
        } else if (args.task === 'claim') {
            await hre.run('private-vesting-claim')
        } else if (args.task === 'info') {
            await hre.run('private-vesting-info')
        } else if (args.task === 'revoke') {
            await hre.run('private-vesting-voke')
        } else if (args.task === 'set-rte') {
            await hre.run('private-vesting-set-rte')
        }
    })

subtask('market-get-nfts', '').setAction(async (args, hre) => {
    const { marketAddress, rteAddress } = require(`../${hre.network.name}_address.json`)
    const signers = await ethers.getSigners()

    const market = new ethers.Contract(
        marketAddress,
        marketAbi,
        signers[0]
    )

    const nfts = await market.getUserNFTs()
    console.log({ nfts })
})
