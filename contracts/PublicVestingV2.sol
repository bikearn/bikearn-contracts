// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import './interfaces/IVesting.sol';

contract PublicVestingV2 is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rte;
    address public vestingContract;

    uint256 public startBuyTime;
    uint256 public claimTime;
    uint256 public cliffTime;

    uint256 public initVestingPercent = 25;
    uint256 public immutable VESTING_WINDOW = 1 days; // 1 day in seconds
    uint256 public immutable VESTING_DURATION = 90; // 90 days
    uint256 public dailyVestingPercent = 1111111111111111; // 1.1111111111111111 percent

    struct Debt {
        uint256 initVestingDebt;
        uint256 dailyVestingDebt;
    }

    mapping(address => Debt) public debtByAddress;

    constructor(
        address _rte,
        address _vestingContract,
        uint256 _startBuyTime,
        uint256 _claimTime,
        uint256 _cliffTime
    ) {
        rte = IERC20(_rte);
        vestingContract = _vestingContract;

        startBuyTime = _startBuyTime;
        claimTime = _claimTime;
        cliffTime = _cliffTime;
    }

    function revokeToken(IERC20 token) external onlyOwner {
        uint256 amount = token.balanceOf(address(this));
        token.safeTransfer(msg.sender, amount);
    }

    function setRte(address _rte) external onlyOwner {
        rte = IERC20(_rte);
    }

    function setClaimTime(uint256 _claimTime) external onlyOwner {
        claimTime = _claimTime;
    }

    function setCliffTime(uint256 _cliffTime) external onlyOwner {
        cliffTime = _cliffTime;
    }

    // -----------------------------------

    function getUserInfo() public view returns (IVesting.User memory) {
        IVesting.User memory user = IVesting(vestingContract).userByAddress(msg.sender);
        return user;
    }

    function getVestingAmount() public view returns (uint256) {
        IVesting.User memory user = getUserInfo();
        Debt memory debt = debtByAddress[msg.sender];

        uint256 initVestingAmount = 0;
        if (block.timestamp >= claimTime) {
            initVestingAmount = user.initVestingAmount - debt.initVestingDebt;
        }

        uint256 dailyVestingAmount = 0;
        if (block.timestamp >= cliffTime) {
            uint256 numDay = block.timestamp.sub(startBuyTime).div(VESTING_WINDOW);
            numDay = numDay > VESTING_DURATION ? VESTING_DURATION : numDay;

            if (numDay == VESTING_DURATION) {
                dailyVestingAmount = user.dailyVestingAmount - debt.dailyVestingDebt;
            } else {
                dailyVestingAmount = user.dailyVestingAmount.mul(dailyVestingPercent).div(1e17).mul(numDay) - debt.dailyVestingDebt;
            }
        }

        return initVestingAmount + dailyVestingAmount;
    }

    function claim() external {
        uint256 vestingAmount = getVestingAmount();
        require(vestingAmount > 0, "claim: error");

        rte.safeTransfer(msg.sender, vestingAmount);

        IVesting.User memory user = getUserInfo();
        Debt storage debt = debtByAddress[msg.sender];

        debt.dailyVestingDebt += vestingAmount;
        if (debt.initVestingDebt == 0) {
            debt.dailyVestingDebt -= user.initVestingAmount;
            debt.initVestingDebt = user.initVestingAmount;
        }
    }
}
