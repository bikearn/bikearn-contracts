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
        } else if (args.task === 'getSale') {
            await hre.run('market-get-active-sales')
        } else if (args.task === 'buy') {
            await hre.run('market-buy')
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

subtask('market-get-active-sales', '').setAction(async (args, hre) => {
    const { marketAddress, rteAddress } = require(`../${hre.network.name}_address.json`)
    const signers = await ethers.getSigners()

    const market = new ethers.Contract(
        marketAddress,
        marketAbi,
        signers[0]
    )

    const nfts = await market.getActiveSalesByPage(0, 10)
    console.log({ nfts })
})

subtask('market-buy', '').setAction(async (args, hre) => {
    const { marketAddress, busdAddress } = require(`../${hre.network.name}_address.json`)
    const signers = await ethers.getSigners()
    const signer = signers[0]

    const market = new ethers.Contract(
        marketAddress,
        marketAbi,
        signer
    )

    const busd = new ethers.Contract(
        busdAddress,
        busdAbi,
        signer
    )

    /* const busdApproval = await busd.approve(market.address, UNLIMITED_ALLOWANCE)
    await busdApproval.wait() */

    const buy = await market.purchaseSale(3)
    await buy.wait()
})
