// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "./AbstractDebtToken.sol";

contract MockDebtToken is AbstractDebtToken {

    uint private mockTimestamp;

    constructor(string memory name, string memory symbol, uint _debtIndex, uint _mockTimestamp)
        AbstractDebtToken(name, symbol, _debtIndex)
    {
        mockTimestamp = _mockTimestamp;
    }

    // Function to set the mock timestamp
    function setMockTimestamp(uint _mockTimestamp) external {
        mockTimestamp = _mockTimestamp;
    }

    function getElapsedTime() public view virtual override returns (uint) {
        return mockTimestamp;
    }

}