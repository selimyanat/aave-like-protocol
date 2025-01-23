// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;


import "hardhat/console.sol";

contract LendingRate {

    uint public constant DECIMALS = 1e18;

    // A percentage (e.g., 10%) of the interest paid by borrowers is kept by the protocol as a reserve to 
    // cover potential losses or provide protocol revenue.
    // The protocol collects fees implicitly as part of the reserve factor. These fees are 
    // essentially interest payments that are not distributed to lenders but remain in the protocol's reserve fund.
    uint public reserveFactor;

    // The lending rate represents the annualized return that lenders earn on their deposited assets. It provides lenders 
    // with an understanding of their expected earnings over time.
    // The lending rate influences the rate at which the exchange rate appreciates. A higher lending rate leads to a faster 
    // increase in the exchange rate, indicating that IBTs are accruing value more rapidly.
    uint public lendingRate;

    event LendingRateUpdated(uint newLendingRate);

    constructor(uint _reserveFactor) {
        require(reserveFactor <= DECIMALS, "Reserve factor exceeds 100%");
        reserveFactor = _reserveFactor;
    }

    function recalculateLendingRate(uint borrowingRate) external returns (uint) {
        // The lending rate is derived from the borrowing rate, with a portion reserved for the protocol based 
        // on the reserve factor.
        // Lending Rate (APR)=Borrow Rate×(1−Reserve Factor)
        // If lending rates are compounded continuously: the formula for the effective borrowing rate is
        // Effective Lending Rate (APY)= (e lending APR) −1

        lendingRate = borrowingRate * (DECIMALS - reserveFactor) / DECIMALS;
        emit LendingRateUpdated(lendingRate);
        return lendingRate;
    }

    function getLendingRate() public view returns (uint) {
        return lendingRate;
    }
}