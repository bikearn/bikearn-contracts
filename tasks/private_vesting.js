const fs = require('fs')
const { task, types } = require('hardhat/config')
const { parseEther, formatEther, UNLIMITED_ALLOWANCE, txUrl } = require('../utils')

const vestingAbi =
    require('../artifacts/contracts/PrivateVesting.sol/PrivateVesting.json').abi
const rteAbi =
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
        }
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
    const { privateVestingAddress, rteAddress } = require(`../${hre.network.name}_address.json`)
    const signer = await ethers.getSigner()

    const vesting = new ethers.Contract(
        privateVestingAddress,
        vestingAbi,
        signer
    )
    const rte = new ethers.Contract(
        rteAddress,
        rteAbi,
        signer
    )

    const allowance = await rte.allowance(signer.address, vesting.address)
    if (allowance.eq(ethers.BigNumber.from('0'))) {
        const rteApproval = await rte.approve(vesting.address, UNLIMITED_ALLOWANCE)
        await rteApproval.wait()
    }

    try {
        const buy = await vesting.buy(parseEther('900'))
        await buy.wait()

        txUrl(hre.network.name, buy)
    } catch (err) {
        console.log(err.message)
    }

    console.log('done')
})

subtask('private-vesting-claim', 'claim').setAction(async (args, hre) => {
    const { privateVestingAddress, rteAddress } = require(`../${hre.network.name}_address.json`)
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