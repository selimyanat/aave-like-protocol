// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./AbstractIBToken.sol";

contract MockIBToken is AbstractIBToken {

    uint private mockTimestamp;

    constructor(string memory name, string memory symbol, uint _exchangeRate, uint _mockTimestamp)
        AbstractIBToken(name, symbol, _exchangeRate)
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
