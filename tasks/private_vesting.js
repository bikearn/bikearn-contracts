const fs = require('fs')
const { task, types } = require('hardhat/config')
const { parseEther, formatEther, UNLIMITED_ALLOWANCE, txUrl } = require('../utils')

const vestingAbi =
    require('../artifacts/contracts/PrivateVesting.sol/PrivateVesting.json').abi
const busdAbi =
    require('../artifacts/contracts/RTE.sol/RTE.json').abi

task('private-vesting', 'private vesting tasks')
    .addParam('task', 'task', undefined, types.string)
    .setAction(async (args, hre) => {
        if (args.task === 'getUser') {
            await hre.run('private-vesting-get-user')
        } else if (args.task === 'buy') {
            await hre.run('private-vesting-buy')
        } else if (args.task === 'claim') {
            await hre.run('private-vesting-claim')
        } else if (args.task === 'pending') {
            await hre.run('private-vesting-pending')
        } else if (args.task === 'revoke') {
            await hre.run('private-vesting-voke')
        } else if (args.task === 'progress') {
            await hre.run('private-vesting-progress')
        }
    })

subtask('private-vesting-progress', 'progress').setAction(async (args, hre) => {
    const { privateVestingAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )

    const progress = await vesting.progress()
    console.log({ progress: formatEther(progress) })
})

subtask('private-vesting-pending', 'get pending amount').setAction(async (args, hre) => {
    const { privateVestingAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )

    const pending = await vesting.getVestingAmount()
    console.log({pending: formatEther(pending)})
})

subtask('private-vesting-revoke', 'revoke').setAction(async (args, hre) => {
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

subtask('private-vesting-get-user', 'get user').setAction(async (args, hre) => {
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

subtask('private-vesting-buy', 'buy').setAction(async (args, hre) => {
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

subtask('private-vesting-claim', 'claim').setAction(async (args, hre) => {
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
