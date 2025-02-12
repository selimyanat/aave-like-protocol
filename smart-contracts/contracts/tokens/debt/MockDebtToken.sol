// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "./AbstractDebtToken.sol";

/**
 * @title MockDebtToken
 * @dev A mock implementation of the AbstractDebtToken, used for testing purposes.
 * This contract overrides the `getElapsedTime` function to allow setting a mock timestamp, making it suitable for controlled testing.
 */
contract MockDebtToken is AbstractDebtToken {

    /// @notice A mock timestamp for testing purposes.
    uint private mockTimestamp;

    /**
     * @notice Deploys the MockDebtToken contract.
     * @dev Inherits the AbstractDebtToken constructor for initialization.
     * @param name The name of the debt token.
     * @param symbol The symbol of the debt token.
     * @param _debtIndex The initial debt index for the token.
     * @param _mockTimestamp The initial mock timestamp for testing elapsed time logic.
     */
    constructor(string memory name, string memory symbol, uint _debtIndex, uint _mockTimestamp, address _borrowingRate)
        AbstractDebtToken(name, symbol, _debtIndex, _borrowingRate)
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
     * @notice Overrides the `getElapsedTime` function to return the mock timestamp.
     * @return The mock timestamp as the elapsed time.
     */
    function getElapsedTime() public view virtual override returns (uint) {
        return mockTimestamp;
    }

}