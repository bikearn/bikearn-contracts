const { expect } = require("chai")
const { ethers } = require("hardhat")
const { getContract, UNLIMITED_ALLOWANCE, parseEther, formatEther } = require('../utils')

const DAY = 60 * 60 * 24

describe('Private Vesting', () => {
    before('set up', async () => {
        this.signers = await ethers.getSigners()
        this.RTE = await getContract(ethers, 'RTE')
        this.PrivateVesting = await getContract(ethers, 'PrivateVesting')
        this.PrivateVestingV2 = await getContract(ethers, 'PrivateVestingV2')
    })

    it('deploy', async () => {
        const rteDeploy = await this.RTE.contract.deploy()
        await rteDeploy.deployed()
        
        const busdDeploy = await this.RTE.contract.deploy()
        await busdDeploy.deployed()

        const currentTime = Math.floor(Date.now() / 1000)
        const vestingDeploy = await this.PrivateVesting
            .contract
            .deploy(
                rteDeploy.address,
                busdDeploy.address,
                this.signers[0].address,
                currentTime - DAY * 3, // start buy time
                currentTime + DAY * 5, // end buy time
                currentTime + DAY * 0, // claim time
                currentTime + DAY * 5, // cliff time
                currentTime - 60 * 45, // listing time
            )
        await vestingDeploy.deployed()

        const privateVestingV2Deploy = await this.PrivateVestingV2
            .contract
            .deploy(
                rteDeploy.address,
                vestingDeploy.address,
                currentTime - DAY * 182, // start buy time
                currentTime + DAY * 0, // claim buy time
                currentTime + DAY * 0 // cliff buy time
            )
        await privateVestingV2Deploy.deployed()

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

        this.vestingV2 = new ethers.Contract(
            privateVestingV2Deploy.address,
            this.PrivateVestingV2.abi,
            this.signers[0]
        )
    })

    it('transfer', async () => {
        const transfered = await this.rte.transfer(this.vestingV2.address, parseEther('5000000'))
        await transfered.wait()

        const balance = await this.rte.balanceOf(this.vesting.address)
        console.log(formatEther(balance))
    })

    it('approval', async () => {
        const allowance = await this.rte.allowance(this.signers[0].address, this.vestingV2.address)
        if (allowance.eq(ethers.BigNumber.from('0'))) {
            const rteApproval = await this.rte.approve(this.vesting.address, UNLIMITED_ALLOWANCE)
            await rteApproval.wait()
        }

        const busdAllowance = await this.busd.allowance(this.signers[0].address, this.vestingV2.address)
        if (busdAllowance.eq(ethers.BigNumber.from('0'))) {
            const busdApproval = await this.busd.approve(this.vesting.address, UNLIMITED_ALLOWANCE)
            await busdApproval.wait()
        }
    })

    /* it('sale', async () => {
        const total = await this.vesting.totalSale()
        const current = await this.vesting.currentSale()
        const progress = await this.vesting.progress()
        console.log({
            totalSale: formatEther(total),
            currentSale: formatEther(current),
            progress: formatEther(progress)
        })
    }) */

    it('buy', async () => {
        for (let i = 0; i < 2; i++) {
            let bought = await this.vesting.buy(parseEther('300'))
            await bought.wait()
        }

        const busdBalance = await this.busd.balanceOf(this.signers[0].address)
        const user = await this.vesting.userByAddress(this.signers[0].address)
        console.log({
            busdBalance: formatEther(busdBalance),
            buyAmount: formatEther(user.buyAmount),
            initVestingAmount: formatEther(user.initVestingAmount),
            initVestingDebt: formatEther(user.initVestingDebt),
            dailyVestingAmount: formatEther(user.dailyVestingAmount),
            dailyVestingDebt: formatEther(user.dailyVestingDebt),
        })
    })

    /* it('getVestingAmount', async () => {
        const vestingAmount = await this.vesting.getVestingAmount()
        console.log(formatEther(vestingAmount))
    }) */

    /* it('claim', async () => {
        const claimed = await this.vesting.claim()
        await claimed.wait()
        
        const busdBalance = await this.busd.balanceOf(this.signers[0].address)
        const rteBalance = await this.rte.balanceOf(this.signers[0].address)
        const user = await this.vesting.userByAddress(this.signers[0].address)
        console.log({
            busdBalance: formatEther(busdBalance),
            rteBalance: formatEther(rteBalance),
            buyAmount: formatEther(user.buyAmount),
            initVestingAmount: formatEther(user.initVestingAmount),
            initVestingDebt: formatEther(user.initVestingDebt),
            dailyVestingAmount: formatEther(user.dailyVestingAmount),
            dailyVestingDebt: formatEther(user.dailyVestingDebt),
        })
    }) */

    /* it('sale', async () => {
        const total = await this.vesting.totalSale()
        const current = await this.vesting.currentSale()
        const progress = await this.vesting.progress()
        console.log({
            totalSale: formatEther(total),
            currentSale: formatEther(current),
            progress: formatEther(progress)
        })
    }) */

    it('vesting v2', async () => {
        const user = await this.vestingV2.getUserInfo()
        console.log({
            buyAmount: formatEther(user.buyAmount),
            initVestingAmount: formatEther(user.initVestingAmount),
            dailyVestingAmount: formatEther(user.dailyVestingAmount),
        })

        const amount = await this.vestingV2.getVestingAmount()
        console.log({ amount: formatEther(amount) })

        const claimed = await this.vestingV2.claim()
        await claimed.wait()

        const debt = await this.vestingV2.debtByAddress(this.signers[0].address)
        console.log({ 
            initVestingDebt: formatEther(debt.initVestingDebt),
            dailyVestingDebt: formatEther(debt.dailyVestingDebt),
        })

        const amount2 = await this.vestingV2.getVestingAmount()
        console.log({ amount: formatEther(amount2) })
    })
})
