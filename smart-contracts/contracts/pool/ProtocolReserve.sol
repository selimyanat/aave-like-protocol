// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../tokens/TradableToken.sol";


contract ProtocolReserve {

    uint public constant DECIMALS = 1e18;

    TradableToken public tradableToken;

    event TradableTokenFeeCollected(address indexed from, uint fee);
    event TradableTokenWithdrawn(address indexed to, uint amount);
    
    constructor(address _tradableToken) {
        tradableToken = TradableToken(_tradableToken);
    }

    function collectTradabelTokenFee(uint fee) external {
        require(fee > 0, "Fee must be greater than zero");
        SafeERC20.safeTransferFrom(tradableToken, msg.sender, address(this), fee);
        emit TradableTokenFeeCollected(msg.sender, fee);
    }

    function withdrawTradableToken(uint amount, address to) external  {
        uint totalReserve = tradableToken.balanceOf(address(this));
        require(amount <= totalReserve, "Insufficient reserve");
        SafeERC20.safeTransfer(tradableToken, to, amount);
        emit TradableTokenWithdrawn(to, amount);
    }
}