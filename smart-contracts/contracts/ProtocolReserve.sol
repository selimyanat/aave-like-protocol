// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "./TradableToken.sol";

contract ProtocolReserve {

    uint public constant DECIMALS = 1e18;

    TradableToken public tradableToken;

    event TradableTokenFeeCollected(address indexed from, uint amount);
    event TradableTokenWithdrawn(address indexed to, uint amount);
    
    constructor(address _tradableToken) {
        tradableToken = TradableToken(_tradableToken);
    }

    function collectTradabelTokenFee(uint amount) external {
        require(amount > 0, "Amount must be greater than zero");
        tradableToken.transferFrom(msg.sender, address(this), amount);
        emit TradableTokenFeeCollected(msg.sender, amount);
    }

    function withdrawTradableToken(uint amount, address to) external  {
        uint totalReserve = IERC20(tradableToken).balanceOf(address(this));
        require(amount <= totalReserve, "Insufficient reserve");
        tradableToken.transfer(to, amount);
        emit TradableTokenWithdrawn(to, amount);
    }
}