// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBike {
    function getGameItem(uint256 tokenId)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        );
}
