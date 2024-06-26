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

    address public dev;

    uint256 public startBuyTime;
    uint256 public endBuyTime;
    uint256 public claimTime;
    // uint256 public cliffTime;
    // uint256 public listingTime;

    uint256 public initVestingPercent = 100;
    uint256 public ipoPrice = 1e17; // 0.1
    // uint256 public immutable VESTING_WINDOW = 1 days; // 1 day in seconds
    // uint256 public immutable VESTING_DURATION = 90; // 90 days
    // uint256 public dailyVestingPercent = 1111111111111111; // 1.1111111111111111 percent

    uint256 public totalSale = 2000000 ether;
    uint256 public currentSale = 0 ether;
    // uint256 public maxBuyAmount = 500 ether;
    uint256 public minBuyAmount = 30 ether;

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
        address _dev,
        uint256 _startBuyTime,
        uint256 _endBuyTime,
        uint256 _claimTime
    ) {
        rte = IERC20(_rte);
        busd = IERC20(_busd);

        dev = _dev;

        startBuyTime = _startBuyTime;
        endBuyTime = _endBuyTime;
        claimTime = _claimTime;
        // cliffTime = _cliffTime;
        // listingTime = _listingTime;

        // require(claimTime <= cliffTime, "init error");
    }

    function refund(address _user) external onlyOwner {
        User storage user = userByAddress[_user];
        require(user.buyAmount > 0, "refund: invalid amount");

        // if (user.initVestingDebt + user.dailyVestingDebt > 0) {
        if (user.initVestingDebt > 0) {
            // rte.safeTransferFrom(msg.sender, address(this), user.initVestingDebt + user.dailyVestingDebt);
            rte.safeTransferFrom(msg.sender, address(this), user.initVestingDebt);
        }

        busd.safeTransfer(msg.sender, user.buyAmount);

        currentSale -= user.buyAmount;
        user.buyAmount = 0;
        user.initVestingAmount = 0;
        user.initVestingDebt = 0;
        // user.dailyVestingAmount = 0;
        // user.dailyVestingDebt = 0;
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
        require(buyAmount >= minBuyAmount, "buy: invalid amount");
        require(currentSale + buyAmount <= totalSale, "buy: exceeds total sale");

        User storage user = userByAddress[msg.sender];

        busd.safeTransferFrom(msg.sender, dev, buyAmount);
        currentSale += buyAmount;
        user.buyAmount += buyAmount;

        uint256 vestingAmount = buyAmount.mul(1e18).div(ipoPrice);
        uint256 initVestingAmount = vestingAmount.mul(initVestingPercent).div(100);
        user.initVestingAmount += initVestingAmount;
        // user.dailyVestingAmount += vestingAmount.sub(initVestingAmount);

        Buy(msg.sender, buyAmount, block.timestamp);
    }

    function getVestingAmount() public view returns (uint256) {
        User storage user = userByAddress[msg.sender];

        uint256 initVestingAmount = 0;
        if (block.timestamp >= claimTime) {
            initVestingAmount = user.initVestingAmount - user.initVestingDebt;
        }

        // uint256 dailyVestingAmount = 0;
        // if (block.timestamp >= cliffTime) {
        //     uint256 numDay = block.timestamp.sub(startBuyTime).div(VESTING_WINDOW);
        //     numDay = numDay > VESTING_DURATION ? VESTING_DURATION : numDay;

        //     if (numDay == VESTING_DURATION) {
        //         dailyVestingAmount = user.dailyVestingAmount - user.dailyVestingDebt;
        //     } else {
        //         dailyVestingAmount = user.dailyVestingAmount.mul(dailyVestingPercent).div(1e17).mul(numDay) - user.dailyVestingDebt;
        //     }
        // }

        //return initVestingAmount + dailyVestingAmount;

        return initVestingAmount;
    }

    event Claim(address caller, uint256 amount, uint256 timestamp);

    function claim() external {
        require(block.timestamp >= claimTime, "claim: vest is currently locked");

        uint256 vestingAmount = getVestingAmount();
        require(vestingAmount > 0, "claim: not enough amount");

        rte.safeTransfer(msg.sender, vestingAmount);
        User storage user = userByAddress[msg.sender];
        if (user.initVestingDebt == 0) {
            user.initVestingDebt = user.initVestingAmount;
        }

        Claim(msg.sender, vestingAmount, block.timestamp);
    }
}
