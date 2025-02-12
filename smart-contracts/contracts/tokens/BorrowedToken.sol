// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title BorrowedToken
/// @notice This ERC20 token is designed to be supported by a lending pool, allowing users to borrow this token.
/// @dev Inherits the OpenZeppelin ERC20 implementation.
contract BorrowedToken is ERC20 {
    
    /// @notice Deploys the BorrowedToken contract.
    /// @param name The name of the token.
    /// @param symbol The symbol representing the token.
    /// @param totalSupply The initial total supply of the token, minted to the deployer's address.    
    constructor(string memory name, string memory symbol, uint totalSupply) ERC20(name, symbol) {
        
        _mint(msg.sender, totalSupply);
    }
}