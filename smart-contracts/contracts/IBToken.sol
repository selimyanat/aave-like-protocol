// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./abstract/AbstractIBToken.sol";


import "hardhat/console.sol";

/**
When using interest-bearing tokens (IBToken) for lenders and debt tokens for borrowers, the yield distribution to 
lenders is handled implicitly through the increasing exchange rate of the IBToken. You do not need to explicitly 
distribute yield manually because the exchange rate mechanics already incorporate the accrued interest, ensuring 
that lenders' tokens automatically reflect their share of the pool.
 */

abstract contract IBToken is AbstractIBToken {


    constructor(string memory name, string memory symbol, uint _exchangeRate) AbstractIBToken(name, symbol,  _exchangeRate) {
    }
}