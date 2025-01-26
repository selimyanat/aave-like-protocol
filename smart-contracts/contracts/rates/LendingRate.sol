// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;


import "hardhat/console.sol";

/// @title LendingRate Contract
/// @notice This contract calculates the lending rate based on the borrowing rate and a reserve factor.
/// @dev The lending rate is adjusted according to the reserve factor to determine the annualized return for lenders.
contract LendingRate {

    /// @notice Decimal precision used for calculations (1e18).
    uint public constant DECIMALS = 1e18;

    // A percentage (e.g., 10%) of the interest paid by borrowers is kept by the protocol as a reserve to 
    // cover potential losses or provide protocol revenue.
    // The protocol collects fees implicitly as part of the reserve factor. These fees are 
    // essentially interest payments that are not distributed to lenders but remain in the protocol's reserve fund.

    /// @notice The portion of interest paid by borrowers that is retained by the protocol as a reserve.
    /// @dev Expressed as a fraction of DECIMALS (e.g., 10% is represented as 0.1 * DECIMALS).
    uint public reserveFactor;


    /// @notice The current annualized lending rate after accounting for the reserve factor.
    /// @dev Represents the return lenders earn on their deposited assets.    
    uint public lendingRate;

    /// @notice Emitted when the lending rate is updated.
    /// @param newLendingRate The newly calculated lending rate.
    event LendingRateUpdated(uint newLendingRate);


    /// @notice Initializes the contract with a specified reserve factor.
    /// @param _reserveFactor The initial reserve factor, scaled by DECIMALS.
    /// @dev The reserve factor must not exceed DECIMALS (i.e., 100%).
    constructor(uint _reserveFactor) {
        require(reserveFactor <= DECIMALS, "Reserve factor exceeds 100%");
        reserveFactor = _reserveFactor;
    }

    /// @notice Recalculates the lending rate based on the provided borrowing rate.
    /// @param borrowingRate The current borrowing rate, scaled by DECIMALS.
    /// @return The updated lending rate.
    /// @dev The lending rate is computed as: borrowingRate * (1 - reserveFactor).    
    function recalculateLendingRate(uint borrowingRate) external returns (uint) {
        lendingRate = borrowingRate * (DECIMALS - reserveFactor) / DECIMALS;
        emit LendingRateUpdated(lendingRate);
        return lendingRate;
    }

    /// @notice Retrieves the current lending rate.
    /// @return The current lending rate, scaled by DECIMALS.
    function getLendingRate() public view returns (uint) {
        return lendingRate;
    }
}