// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "hardhat/console.sol";

contract BorrowingRate {

    uint public constant DECIMALS = 1e18;

    // The base borrowing rate is the minimum interest rate that the borrower has to pay.
    uint public baseBorrowingrate;

    // A factor that scales the increase in the borrow rate as utilization rises. 
    uint public multiplier;

    uint public borrowingRate;

    event BorrowingRateUpdated(uint newBorrowingRate);

    constructor(uint _baseBorrowingrate, uint _multiplier) {
        baseBorrowingrate = _baseBorrowingrate;
        multiplier = _multiplier;
    }

    function recalculateBorrowingRate(uint utilizationRate) external returns (uint) {
        // The borrowing rate rises proportionally with utilization due to the multiplier.
        // borrow rate=Base Rate+(Utilization rate × Multiplier)
        borrowingRate = baseBorrowingrate + (utilizationRate * multiplier) / DECIMALS;
        emit BorrowingRateUpdated(borrowingRate);
        return borrowingRate;
    }

    function getBorrowingRate() public view returns (uint) {
        return borrowingRate;
    }

    function getBaseBorrowingRate() public view returns (uint) {
        return baseBorrowingrate;
    }
}