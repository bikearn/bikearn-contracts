// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVesting {
    struct User {
        uint256 buyAmount;
        uint256 initVestingAmount;
        uint256 initVestingDebt;
        uint256 dailyVestingAmount;
        uint256 dailyVestingDebt;
    }

    function userByAddress(address _address) external view returns (User memory);
}
