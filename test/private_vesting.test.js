const { expect } = require("chai")
const { ethers } = require("hardhat")
const { getContract, UNLIMITED_ALLOWANCE, parseEther, formatEther } = require('../utils')

describe('Private Vesting', () => {
    before('set up', async () => {
        this.signers = await ethers.getSigners()
        this.RTE = await getContract(ethers, 'RTE')
        this.PrivateVesting = await getContract(ethers, 'PrivateVesting')
    })

    it('deploy', async () => {
        const rteDeploy = await this.RTE.contract.deploy()
        await rteDeploy.deployed()
        
        const busdDeploy = await this.RTE.contract.deploy()
        await busdDeploy.deployed()

        const vestingDeploy = await this.PrivateVesting
            .contract
            .deploy(
                rteDeploy.address,
                busdDeploy.address,
                this.signers[2].address,
                Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 2,
                // 0
            )
        await vestingDeploy.deployed()

        this.rte = new ethers.Contract(
            rteDeploy.address,
            this.RTE.abi,
            this.signers[0]
        )

        this.busd = new ethers.Contract(
            busdDeploy.address,
            this.RTE.abi,
            this.signers[0]
        )

        this.vesting = new ethers.Contract(
            vestingDeploy.address,
            this.PrivateVesting.abi,
            this.signers[0]
        )
    })

    it('transfer', async () => {
        const transfered = await this.rte.transfer(this.vesting.address, parseEther('5000000'))
        await transfered.wait()

        const balance = await this.rte.balanceOf(this.vesting.address)
        console.log(formatEther(balance))
    })

    it('approval', async () => {
        const allowance = await this.rte.allowance(this.signers[0].address, this.vesting.address)
        if (allowance.eq(ethers.BigNumber.from('0'))) {
            const rteApproval = await this.rte.approve(this.vesting.address, UNLIMITED_ALLOWANCE)
            await rteApproval.wait()
        }

        const busdAllowance = await this.busd.allowance(this.signers[0].address, this.vesting.address)
        if (busdAllowance.eq(ethers.BigNumber.from('0'))) {
            const busdApproval = await this.busd.approve(this.vesting.address, UNLIMITED_ALLOWANCE)
            await busdApproval.wait()
        }
    })

    it('buy', async () => {
        for (let i = 0; i < 2; i++) {
            let bought = await this.vesting.buy(parseEther('300'))
            await bought.wait()
        }

        const user = await this.vesting.userByAddress(this.signers[0].address)
        console.log({
            buyAmount: formatEther(user.buyAmount),
            initVestingAmount: formatEther(user.initVestingAmount),
            dailyVestingAmount: formatEther(user.dailyVestingAmount),
            dailyVestingDebt: formatEther(user.dailyVestingDebt),
        })
    })

    it('getVestingAmount', async () => {
        const vestingAmount = await this.vesting.getVestingAmount()
        console.log(formatEther(vestingAmount))
    })

    it('claim', async () => {
        const claimed = await this.vesting.claim()
        await claimed.wait()
        
        const balance = await this.rte.balanceOf(this.signers[0].address)
        const user = await this.vesting.userByAddress(this.signers[0].address)
        console.log({
            balance: formatEther(balance),
            buyAmount: formatEther(user.buyAmount),
            initVestingAmount: formatEther(user.initVestingAmount),
            dailyVestingAmount: formatEther(user.dailyVestingAmount),
            dailyVestingDebt: formatEther(user.dailyVestingDebt),
        })
    })

    /* it('claim2', async () => {
        const claimed = await this.vesting.claim()
        await claimed.wait()
    }) */
})
