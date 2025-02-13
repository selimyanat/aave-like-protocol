// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./AbstractIBToken.sol";


import "hardhat/console.sol";

/**
 * @title IBToken
 * @dev A concrete implementation of the AbstractIBToken contract. This token represents interest-bearing tokens for lenders in a lending protocol.
 * The IBToken reflects the growth of the underlying asset pool through an increasing exchange rate, which implicitly distributes yield to lenders.
 */
abstract contract IBToken is AbstractIBToken {


    /**
     * @notice Deploys the IBToken contract.
     * @dev Initializes the contract using the AbstractIBToken constructor.
     * @param name The name of the IBToken.
     * @param symbol The symbol of the IBToken.
     * @param _exchangeRate The initial exchange rate of the IBToken in terms of the underlying asset.
     * @param _lendingRate The address of the LendingRate contract managing the lending rate.
     */
    constructor(string memory name, string memory symbol, uint _exchangeRate, address _lendingRate) AbstractIBToken(name, symbol,  _exchangeRate,  _lendingRate) {
    }
}