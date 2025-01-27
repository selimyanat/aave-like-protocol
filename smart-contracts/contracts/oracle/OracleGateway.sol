// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title OracleGateway
 * @dev A simple oracle contract to store and update the price of a collateral asset in terms of tradable token (like
 * 1 ETH is worth 1000 tradable tokens, where ETH is the collateral).
 */
contract OracleGateway {

    /// @notice The current price of the collateral asset
    uint public collateralPrice;

    /// @notice The timestamp of the last update to the collateral price.
    uint public lastUpdatedTimestamp;

    /**
     * @dev Emitted when the collateral price is updated.
     * @param newPrice The new price of the collateral in terms of the tradable token.
    */
    event CollateralPriceUpdated(uint newPrice);

    /**
     * @notice Constructor to initialize the oracle with an initial collateral price.
     * @param _collateralPrice The initial price of the collateral in terms of the tradable token.
     */
    constructor(uint _collateralPrice) {
        collateralPrice = _collateralPrice;
    }

    /**
     * @notice Updates the collateral price.
     * @dev Updates the `collateralPrice` and records the timestamp of the update.
     * Emits a `CollateralPriceUpdated` event.
     * @param _newPrice The new price of the collateral asset in terms of the tradable token.
     */
    function updateCollateralPrice(uint _newPrice) external {
        collateralPrice = _newPrice;
        lastUpdatedTimestamp = block.timestamp;
        emit CollateralPriceUpdated(_newPrice);
    }

    /**
     * @notice Returns the current price of the collateral.
     * @return The current collateral price as a `uint`.
     */
    function getCollateralPrice() external view returns (uint) {
        return collateralPrice;
    }
}