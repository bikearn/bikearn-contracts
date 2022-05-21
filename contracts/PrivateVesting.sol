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
    uint256 public cliffTime = 60 days;
    uint256 public initVestingPercent = 15;
    uint256 public ipoPrice = 48e14; // 0.0048

    uint256 public maxBuyAmount = 900 ether;
    uint256 public minBuyAmount = 300 ether;
    
    struct User {
        uint256 buyAmount;
        uint256 vestingAmount;
        bool initClaimed;
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
        rte.safeTransferFrom(address(this), msg.sender, amount);
    }

    event Buy(address buyer, uint256 amount, uint256 timestamp);

    function buy(uint256 _buyAmount) external {
        require(_buyAmount >= minBuyAmount && _buyAmount <= maxBuyAmount, "buy: invalid amount");
        require(userByAddress[msg.sender].buyAmount + _buyAmount <= maxBuyAmount, "buy: max amount exceeds");

        busd.safeTransferFrom(msg.sender, dev, _buyAmount);
        userByAddress[msg.sender].buyAmount += _buyAmount;
        userByAddress[msg.sender].vestingAmount += _buyAmount.div(ipoPrice).mul(1e18);

        Buy(msg.sender, _buyAmount, block.timestamp);
    }

    function getVestingAmount() public view returns (uint256) {
        uint256 initVestingAmount = userByAddress[msg.sender]
            .vestingAmount
            .mul(initVestingPercent)
            .div(100);

        return initVestingAmount;
    }

    event Claim(address caller, uint256 amount, uint256 timestamp);

    function claim() external {
        uint256 vestingAmount = getVestingAmount();
        require(vestingAmount > 0, "claim: invalid claim amount");
        
        rte.safeTransfer(msg.sender, vestingAmount);

        Claim(msg.sender, vestingAmount, block.timestamp);
    }
}
