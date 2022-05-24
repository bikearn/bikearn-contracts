// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract PublicVesting is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rte;
    IERC20 public busd;

    uint256 public startBuyTime;
    uint256 public endBuyTime;
    uint256 public claimTime;
    uint256 public cliffTime;
    uint256 public listingTime;

    uint256 public initVestingPercent = 25;
    uint256 public ipoPrice = 12e15; // 0.012
    uint256 public immutable VESTING_WINDOW = 1 days; // 1 day in seconds
    uint256 public immutable VESTING_DURATION = 90; // 90 days
    uint256 public dailyVestingPercent = 1111111111111111; // 1.1111111111111111 percent

    uint256 public totalSale = 100000 ether;
    uint256 public currentSale = 0 ether;
    uint256 public maxBuyAmount = 500 ether;
    uint256 public minBuyAmount = 200 ether;
    
    struct User {
        uint256 buyAmount;
        uint256 initVestingAmount;
        uint256 initVestingDebt;
        uint256 dailyVestingAmount;
        uint256 dailyVestingDebt;
    }

    mapping(address => User) public userByAddress;

    constructor(
        address _rte,
        address _busd,
        uint256 _startBuyTime,
        uint256 _endBuyTime,
        uint256 _claimTime,
        uint256 _cliffTime,
        uint256 _listingTime
    ) {
        rte = IERC20(_rte);
        busd = IERC20(_busd);

        startBuyTime = _startBuyTime;
        endBuyTime = _endBuyTime;
        claimTime = _claimTime;
        cliffTime = _cliffTime;
        listingTime = _listingTime;

        require(claimTime <= cliffTime, "init error");
    }

    function revokeRte() external onlyOwner {
        uint256 amount = rte.balanceOf(address(this));
        rte.safeTransfer(msg.sender, amount);
    }

    function revokeBusd() external onlyOwner {
        uint256 amount = busd.balanceOf(address(this));
        busd.safeTransfer(msg.sender, amount);
    }

    function progress() external view returns (uint256) {
        return currentSale.mul(1e18).div(totalSale).mul(100);
    }

    event Buy(address buyer, uint256 amount, uint256 timestamp);

    function buy(uint256 buyAmount) external {
        require(block.timestamp >= startBuyTime, "buy: not open");
        require(block.timestamp <= endBuyTime, "buy: buy time expired");
        require(buyAmount >= minBuyAmount && buyAmount <= maxBuyAmount, "buy: invalid amount");
        require(currentSale + buyAmount <= totalSale, "buy: exceeds total sale");

        User storage user = userByAddress[msg.sender];
        require(user.buyAmount + buyAmount <= maxBuyAmount, "buy: max amount exceeds");

        busd.safeTransferFrom(msg.sender, address(this), buyAmount);
        currentSale += buyAmount;
        user.buyAmount += buyAmount;

        uint256 vestingAmount = buyAmount.mul(1e18).div(ipoPrice);
        uint256 initVestingAmount = vestingAmount.mul(initVestingPercent).div(100);
        user.initVestingAmount += initVestingAmount;
        user.dailyVestingAmount += vestingAmount.sub(initVestingAmount);

        Buy(msg.sender, buyAmount, block.timestamp);
    }

    function getVestingAmount() public view returns (uint256) {
        User storage user = userByAddress[msg.sender];

        uint256 initVestingAmount = 0;
        if (block.timestamp >= claimTime) {
            initVestingAmount = user.initVestingAmount - user.initVestingDebt;
        }

        uint256 dailyVestingAmount = 0;
        if (block.timestamp >= cliffTime) {
            uint256 numDay = block.timestamp.sub(startBuyTime).div(VESTING_WINDOW);
            numDay = numDay > VESTING_DURATION ? VESTING_DURATION : numDay;
            
            if (numDay == VESTING_DURATION) {
                dailyVestingAmount = user.dailyVestingAmount - user.dailyVestingDebt;
            } else {
                dailyVestingAmount = user.dailyVestingAmount.mul(dailyVestingPercent).div(1e17).mul(numDay) - user.dailyVestingDebt;
            }
        }

        return initVestingAmount + dailyVestingAmount;
    }

    event Claim(address caller, uint256 amount, uint256 timestamp);

    function claim() external {
        uint256 vestingAmount = getVestingAmount();
        require(vestingAmount > 0, "claim: error");
        
        rte.safeTransfer(msg.sender, vestingAmount);
        User storage user = userByAddress[msg.sender];
        user.dailyVestingDebt += vestingAmount;
        if (user.initVestingDebt == 0) {
            user.dailyVestingDebt -= user.initVestingAmount;
            user.initVestingDebt = user.initVestingAmount;
        }

        Claim(msg.sender, vestingAmount, block.timestamp);
    }

    function refund() external {
        require(block.timestamp >= listingTime + 30 minutes && block.timestamp <= listingTime + 2 hours, "refund: refund time expired");

        User storage user = userByAddress[msg.sender];
        require(user.buyAmount > 0, "refund: invalid amount");

        rte.safeTransferFrom(msg.sender, address(this), user.initVestingDebt + user.dailyVestingDebt);
        busd.safeTransfer(msg.sender, user.buyAmount);

        currentSale -= user.buyAmount;
        user.buyAmount = 0;
        user.initVestingAmount = 0;
        user.initVestingDebt = 0;
        user.dailyVestingAmount = 0;
        user.dailyVestingDebt = 0;
    }
}
