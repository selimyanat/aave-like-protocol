// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./AbstractIBToken.sol";

/**
 * @title MockIBToken
 * @dev A mock implementation of the AbstractIBToken contract, used for testing purposes.
 * This contract allows developers to override the `getElapsedTime` function using a mock timestamp,
 * enabling controlled testing of time-dependent logic.
 */
contract MockIBToken is AbstractIBToken {

    /// @notice A mock timestamp used for testing purposes.
    uint private mockTimestamp;

    /**
     * @notice Deploys the MockIBToken contract.
     * @dev Inherits the AbstractIBToken constructor for initialization.
     * @param name The name of the IBToken.
     * @param symbol The symbol of the IBToken.
     * @param _exchangeRate The initial exchange rate for the IBToken.
     * @param _lendingRate The address of the LendingRate contract managing the lending rate.
     * @param _mockTimestamp The initial mock timestamp for testing elapsed time logic.
     */
    constructor(string memory name, string memory symbol, uint _exchangeRate, address _lendingRate, uint _mockTimestamp)
        AbstractIBToken(name, symbol, _exchangeRate,  _lendingRate)
    {
        mockTimestamp = _mockTimestamp;
    }

    /**
     * @notice Updates the mock timestamp for testing purposes.
     * @param _mockTimestamp The new mock timestamp to set.
     */
    function setMockTimestamp(uint _mockTimestamp) external {
        mockTimestamp = _mockTimestamp;
    }

    /**
     * @notice Overrides the `getElapsedTime` function to return the mock timestamp for testing.
     * @return The mock timestamp as the elapsed time.
     */
    function getElapsedTime() public view virtual override returns (uint) {
        return mockTimestamp;
    }
}
