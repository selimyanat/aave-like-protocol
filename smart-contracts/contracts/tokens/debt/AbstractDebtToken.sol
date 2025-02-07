// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title AbstractDebtToken
 * @dev Abstract implementation of a debt token. Tracks debt obligations of borrowers in a lending protocol.
 * This token is non-transferable between users and is used to track borrowers' outstanding debt balances.
 */
abstract contract AbstractDebtToken is ERC20{

    /// @notice Decimal precision used for calculations (1e18).
    uint public constant DECIMALS = 1e18;

    /// @notice Number of seconds in one year, used for interest calculations.
    uint public constant ONE_YEAR = 365 days;

    /// @notice Current debt index, which tracks cumulative interest accrued over time.
    uint public debtIndex;

    /// @notice Mapping to store the debt index at the time of borrowing for each borrower.
    mapping(address => uint) public borrowerDebtIndex;

    /// @notice The initial debt index value set during contract deployment.
    uint public initialDebtIndex;

    /// @notice The timestamp of the last debt index update.
    uint public lastUpdateTimestamp;

    /// @dev Emitted when the debt index is updated.
    /// @param newDebtIndex The updated value of the debt index.
    event DebtIndexUpdated(uint newDebtIndex);


    /**
     * @notice Constructor to initialize the debt token.
     * @param name The name of the debt token.
     * @param symbol The symbol of the debt token.
     * @param _debtIndex The initial value of the debt index.
     */
    constructor(string memory name, string memory symbol, uint _debtIndex) ERC20(name, symbol) {
        // TODO should start at 1e18 and increase over time as interest accrues
        initialDebtIndex = _debtIndex;
        debtIndex = _debtIndex;
        lastUpdateTimestamp = block.timestamp;
    }
    
    /**
     * @notice Mint debt tokens to a borrower.
     * @param borrower The address of the borrower.
     * @param amount The amount of debt tokens to mint.
     */    
    function mint(address borrower, uint amount) external {

        if (balanceOf(borrower) == 0) {
            // Store the borrower's debt index at borrowing time
            borrowerDebtIndex[borrower] = debtIndex;
        } 
        // TODO: when a borrower takes a second load we need to update borrower's debt index
        // using weighted average formula. This ensures fair interest accrual for multiple 
        // loans.
        _mint(borrower, amount);
    }

    /**
     * @notice Burn debt tokens from a borrower.
     * @param borrower The address of the borrower.
     * @param amount The amount of debt tokens to burn.
     */
    function burn(address borrower, uint amount) external {
        // Reset the borrower's debt index when their debt is fully repaid
        borrowerDebtIndex[borrower] = 0;
        _burn(borrower, amount);
    }

    /**
     * @notice Recalculates the debt index based on the borrowing rate and elapsed time.
     * @dev The debt index is updated to account for accrued interest over the elapsed time.
     * Emits a `DebtIndexUpdated` event.
     * @param borrowingRate The current borrowing rate, scaled by `DECIMALS`.
     * @return The updated debt index.
     */
    function recalculateDebtIndex(uint borrowingRate) external returns (uint) {
        uint timeElapsed = getElapsedTime();
        uint interestAccrued = (borrowingRate * timeElapsed) / ONE_YEAR;
        debtIndex = debtIndex + interestAccrued;
        lastUpdateTimestamp = block.timestamp;
        console.log("Debt Index Updated: %s", debtIndex);
        emit DebtIndexUpdated(debtIndex);
        return debtIndex;
    }

    /**
     * @notice Retrieves the current debt index.
     * @return The current debt index as a `uint`.
     */
    function getDebtIndex() public view returns (uint) {
        return debtIndex;
    }

    /**
     * @notice Retrieves the initial debt index set during deployment.
     * @return The initial debt index as a `uint`.
     */
    function getInitialDebtIndex() public view returns (uint) {
        return initialDebtIndex;
    }

    /**
     * @notice Retrieves the time elapsed since the last update to the debt index.
     * @return The time elapsed, in seconds, as a `uint`.
     */
    function getElapsedTime() public view virtual returns (uint) {
        return block.timestamp - lastUpdateTimestamp;
    }

    /**
     * @dev Overrides the `_beforeTokenTransfer` hook to make debt tokens non-transferable.
     * Allows minting and burning but disallows transfers between non-zero addresses.
     * @param from The address initiating the transfer.
     * @param to The address receiving the transfer.
     * @param amount The amount of tokens being transferred.
     */
    function _beforeTokenTransfer(address from,address to, uint256 amount) internal pure override {
        // Allow minting and burning but disallow transfers between non-zero addresses
        require(
            from == address(0) || to == address(0),
            "Debt tokens are non-transferable"
        );
    }

    /**
     * @dev Retrieves the debt index at the time of borrowing for a specific borrower.
     * @param borrower The address of the borrower.
     * @return The debt index at the time of borrowing for the specified borrower.
     */
    function getDebtIndexAtBorrowing(address borrower) public view returns (uint) {
        return borrowerDebtIndex[borrower];
    }

    /**
     * @dev Retrieves the balance of a user in terms of the underlying asset.
     * @param account The address of the Debt token holder.
     * @return The balance of the user in terms of the underlying asset.
     */
    function balanceOfUnderlying(address account) public view returns (uint) {

        return (balanceOf(account) * debtIndex) / DECIMALS;
    }
}