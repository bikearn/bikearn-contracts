// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract PrivateVesting is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rte;
    IERC20 public busd;

    address public dev;

    uint256 public startTime;
    uint256 public buyDuration = 2 days;
    uint256 public cliffTime = 1 days;
    uint256 public initVestingPercent = 15;
    uint256 public ipoPrice = 48e14; // 0.0048
    uint256 public immutable VESTING_WINDOW = 1 days; // 1 day in seconds
    uint256 public immutable VESTING_DURATION = 183; // 183 days
    uint256 public dailyVestingPercent = 546448087431694; // 0.546448087431694 percent

    uint256 public maxBuyAmount = 900 ether;
    uint256 public minBuyAmount = 300 ether;
    
    struct User {
        uint256 buyAmount;
        uint256 initVestingAmount;
        uint256 dailyVestingAmount;
        uint256 dailyVestingDebt;
    }

    mapping(address => User) public userByAddress;

    constructor(address _rte, address _busd, address _dev, uint256 _startTime) {
        rte = IERC20(_rte);
        busd = IERC20(_busd);
        dev = _dev;
        startTime = _startTime;
    }

    function revoke() external onlyOwner {
        uint256 amount = rte.balanceOf(address(this));
        rte.safeTransfer(msg.sender, amount);
    }

    event Buy(address buyer, uint256 amount, uint256 timestamp);

    function buy(uint256 buyAmount) external {
        require(block.timestamp <= startTime + buyDuration, "buy: closed");
        require(buyAmount >= minBuyAmount && buyAmount <= maxBuyAmount, "buy: invalid amount");
        User storage user = userByAddress[msg.sender];
        require(user.buyAmount + buyAmount <= maxBuyAmount, "buy: max amount exceeds");

        busd.safeTransferFrom(msg.sender, dev, buyAmount);
        user.buyAmount += buyAmount;

        uint256 vestingAmount = buyAmount.div(ipoPrice).mul(1e18);
        uint256 initVestingAmount = vestingAmount.mul(initVestingPercent).div(100);
        user.initVestingAmount += initVestingAmount;
        user.dailyVestingAmount += vestingAmount.sub(initVestingAmount);

        Buy(msg.sender, buyAmount, block.timestamp);
    }

    function getVestingAmount() public view returns (uint256) {
        User storage user = userByAddress[msg.sender];

        uint256 initVestingAmount = 0;
        if (user.initVestingAmount > 0 && block.timestamp >= startTime) {
            initVestingAmount = user.initVestingAmount;
        }

        uint256 dailyVestingAmount = 0;
        if (block.timestamp >= startTime + cliffTime) {
            uint256 numDay = block.timestamp.sub(startTime).div(VESTING_WINDOW);
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
        require(vestingAmount > 0, "claim: invalid claim amount");
        
        rte.safeTransfer(msg.sender, vestingAmount);
        User storage user = userByAddress[msg.sender];
        user.dailyVestingDebt += vestingAmount;
        if (user.initVestingAmount > 0) {
            user.dailyVestingDebt -= user.initVestingAmount;
            user.initVestingAmount = 0;
        }

        Claim(msg.sender, vestingAmount, block.timestamp);
    }
}
