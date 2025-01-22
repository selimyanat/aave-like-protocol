// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract InterestBearingTestToken is ERC20 {

    address public owner;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {        
        owner = msg.sender;
    }

    function mint(address account, uint256 amount) external {
        //require(msg.sender == pool, "Only the pool can mint");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        //require(msg.sender == pool, "Only the pool can burn");
        _burn(account, amount);
    }
}