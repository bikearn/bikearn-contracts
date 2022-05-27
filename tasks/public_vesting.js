const fs = require('fs')
const { task, types } = require('hardhat/config')
const { parseEther, formatEther, UNLIMITED_ALLOWANCE, txUrl } = require('../utils')

const vestingAbi =
    require('../artifacts/contracts/PublicVestingV2.sol/PublicVestingV2.json').abi
const busdAbi =
    require('../artifacts/contracts/RTE.sol/RTE.json').abi

task('public-vesting', 'public vesting tasks')
    .addParam('task', 'task', undefined, types.string)
    .setAction(async (args, hre) => {
        if (args.task === 'getUser') {
            await hre.run('public-vesting-get-user')
        } else if (args.task === 'buy') {
            await hre.run('public-vesting-buy')
        } else if (args.task === 'claim') {
            await hre.run('public-vesting-claim')
        } else if (args.task === 'info') {
            await hre.run('public-vesting-info')
        } else if (args.task === 'revoke') {
            await hre.run('public-vesting-voke')
        } else if (args.task === 'set-rte') {
            await hre.run('public-vesting-set-rte')
        }
    })

subtask('public-vesting-set-rte', 'set rte').setAction(async (args, hre) => {
    const { publicVestingV2Address, rteAddress } = require(`../${hre.network.name}_address.json`)
    const signers = await ethers.getSigners()

    const vesting = new ethers.Contract(
        publicVestingV2Address,
        vestingAbi,
        signers[0]
    )

    const set = await vesting.connect(signers[1]).setRte(rteAddress)
    await set.wait()

    const token = await vesting.rte()
    console.log(token)

    console.log('done')
})

subtask('public-vesting-info', 'get info').setAction(async (args, hre) => {
    const { publicVestingV2Address } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        publicVestingV2Address,
        vestingAbi,
        signer
    )

    const debt = await vesting.debtByAddress('0x4c0Ba67b68FC580cBdDDC3b08B0CE63E8a376Ef8')
    console.log({ debt })

    const amount = await vesting.getVestingAmount()
    console.log({ amount })

    const user = await vesting.getUserInfo()
    console.log({ user })
})

subtask('public-vesting-info', 'get info').setAction(async (args, hre) => {
    const { publicVestingV2Address } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        publicVestingV2Address,
        vestingAbi,
        signer
    )

    const debt = await vesting.debtByAddress('0x4c0Ba67b68FC580cBdDDC3b08B0CE63E8a376Ef8')
    console.log({ debt })

    const amount = await vesting.getVestingAmount()
    console.log({ amount })

    const user = await vesting.getUserInfo()
    console.log({ user })
})

subtask('public-vesting-revoke', 'revoke').setAction(async (args, hre) => {
    const { privateVestingAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )

    const revoked = await vesting.revoke()
    await revoked.wait()

    console.log('done')
})

subtask('public-vesting-get-user', 'get user').setAction(async (args, hre) => {
    const { privateVestingAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )

    const address = "0x1a1a022f208ccb1b3f2d619d8fafcdf093190db4"
    const user = await vesting.userByAddress(address)
    console.log({
        buyAmount: formatEther(user.buyAmount),
        initVestingAmount: formatEther(user.initVestingAmount),
        dailyVestingAmount: formatEther(user.dailyVestingAmount),
        dailyVestingDebt: formatEther(user.dailyVestingDebt),
    })

    console.log('done')
})

subtask('public-vesting-buy', 'buy').setAction(async (args, hre) => {
    const { privateVestingAddress, busdAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )
    const busd = new ethers.Contract(
        busdAddress,
        busdAbi,
        signer
    )

    const buyAmount = parseEther('900')

    const allowance = await busd.allowance(signer.address, vesting.address)
    if (allowance.lt(buyAmount)) {
        const busdApproval = await busd.approve(vesting.address, buyAmount)
        await busdApproval.wait()
    }

    try {
        const buy = await vesting.buy(buyAmount)
        await buy.wait()

        txUrl(hre.network.name, buy)
    } catch (err) {
        console.log(err.message)
    }

    console.log('done')
})

subtask('public-vesting-claim', 'claim').setAction(async (args, hre) => {
    const { privateVestingAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )

    try {
        const claim = await vesting.claim()
        await claim.wait()

        txUrl(hre.network.name, claim)
    } catch (err) {
        console.log(err.message)
    }
})
