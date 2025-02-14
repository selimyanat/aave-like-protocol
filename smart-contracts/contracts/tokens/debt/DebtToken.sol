// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "./AbstractDebtToken.sol";
import "hardhat/console.sol";


/**
 * @title DebtToken
 * @dev A concrete implementation of the AbstractDebtToken. This contract is used to track and manage borrowers' debt obligations in a lending protocol.
 * Inherits the non-transferable debt token logic and all functionality from the AbstractDebtToken contract.
 */
contract DebtToken is AbstractDebtToken {

    /**
     * @notice Deploys the DebtToken contract.
     * @dev Inherits the AbstractDebtToken constructor for initialization.
     * @param name The name of the debt token.
     * @param symbol The symbol of the debt token.
     * @param _debtIndex The initial debt index for the token.
     */
    constructor(string memory name, string memory symbol, uint _debtIndex, address _borrowingRate)
        AbstractDebtToken(name, symbol, _debtIndex, _borrowingRate)
    {
    }

 
}