// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;



contract OracleGateway {

    uint public collateralPrice;

    uint public lastUpdatedTimestamp;

    event CollateralPriceInTradableTokenUpdated(uint newPrice);


    constructor(uint _collateralPrice) {
        collateralPrice = _collateralPrice;
    }

    function updateCollateralPriceInTradableToken(uint _collateralPriceInTradableToken) external {
        collateralPrice = _collateralPriceInTradableToken;
        lastUpdatedTimestamp = block.timestamp;
        emit CollateralPriceInTradableTokenUpdated(_collateralPriceInTradableToken);
    }

    function getCollateralPriceInTradableToken() external view returns (uint) {
        return collateralPrice;
    }
}