// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../tokens/borrowed/BorrowedToken.sol";


contract ProtocolReserve {

    uint public constant DECIMALS = 1e18;

    BorrowedToken public borrowedToken;

    event BorrowedTokenFeeCollected(address indexed from, uint fee);
    event BorrowedTokenWithdrawn(address indexed to, uint amount);
    
    constructor(address _borrowedToken) {
        borrowedToken = BorrowedToken(_borrowedToken);
    }

    function collectBorrowedTokenFee(uint fee) external {
        require(fee > 0, "Fee must be greater than zero");
        SafeERC20.safeTransferFrom(borrowedToken, msg.sender, address(this), fee);
        emit BorrowedTokenFeeCollected(msg.sender, fee);
    }

    function withdrawBorrowedToken(uint amount, address to) external  {
        uint totalReserve = borrowedToken.balanceOf(address(this));
        require(amount <= totalReserve, "Insufficient reserve");
        SafeERC20.safeTransfer(borrowedToken, to, amount);
        emit BorrowedTokenWithdrawn(to, amount);
    }
}