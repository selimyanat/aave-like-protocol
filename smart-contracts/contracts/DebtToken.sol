// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "./abstract/AbstractDebtToken.sol";
import "hardhat/console.sol";


contract DebtToken is AbstractDebtToken {

    constructor(string memory name, string memory symbol, uint _debtIndex)
        AbstractDebtToken(name, symbol, _debtIndex)
    {
    }

 
}