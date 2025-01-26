// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "hardhat/console.sol";

/**
 * @title BorrowingRate
 * @dev A contract for calculating and managing the borrowing rate in a lending protocol.
 * The borrowing rate is influenced by the utilization rate of the pool and a multiplier that scales with utilization.
 */
contract BorrowingRate {

    /// @notice A constant scaling factor used for fixed-point arithmetic.
    uint public constant DECIMALS = 1e18;

     /// @notice The base borrowing rate, representing the minimum interest rate a borrower must pay.
    uint public baseBorrowingrate;

    /// @notice A multiplier that scales the increase in the borrowing rate as the utilization rate rises.
    uint public multiplier;

    /// @notice The current borrowing rate, which is updated based on the utilization rate.
    uint public borrowingRate;

    /**
     * @dev Emitted when the borrowing rate is updated.
     * @param newBorrowingRate The newly calculated borrowing rate.
     */
    event BorrowingRateUpdated(uint newBorrowingRate);

    /**
     * @notice Constructor to initialize the base borrowing rate and multiplier.
     * @param _baseBorrowingrate The initial base borrowing rate.
     * @param _multiplier The multiplier that scales the borrowing rate with the utilization rate.
     */
    constructor(uint _baseBorrowingrate, uint _multiplier) {
        baseBorrowingrate = _baseBorrowingrate;
        multiplier = _multiplier;
    }


    /**
     * @notice Recalculates the borrowing rate based on the current utilization rate.
     * @dev The borrowing rate is calculated as:
     *      Borrowing Rate = Base Borrowing Rate + (Utilization Rate × Multiplier) / DECIMALS
     * Emits a `BorrowingRateUpdated` event.
     * @param utilizationRate The current utilization rate of the pool, scaled by `DECIMALS`.
     * @return The newly calculated borrowing rate.
     */
    function recalculateBorrowingRate(uint utilizationRate) external returns (uint) {
        borrowingRate = baseBorrowingrate + (utilizationRate * multiplier) / DECIMALS;
        emit BorrowingRateUpdated(borrowingRate);
        return borrowingRate;
    }

    /**
     * @notice Returns the current borrowing rate.
     * @return The current borrowing rate as a `uint`.
     */
    function getBorrowingRate() public view returns (uint) {
        return borrowingRate;
    }

    /**
     * @notice Returns the base borrowing rate.
     * @return The base borrowing rate as a `uint`.
     */
    function getBaseBorrowingRate() public view returns (uint) {
        return baseBorrowingrate;
    }
}