// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TradableToken is ERC20 {
    
    constructor(string memory name, string memory symbol, uint totalSupply) ERC20(name, symbol) {
        
        _mint(msg.sender, totalSupply);
    }
}