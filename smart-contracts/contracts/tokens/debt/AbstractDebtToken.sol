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
        _mint(borrower, amount);
    }

    /**
     * @notice Burn debt tokens from a borrower.
     * @param borrower The address of the borrower.
     * @param amount The amount of debt tokens to burn.
     */
    function burn(address borrower, uint amount) external {
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
        // The debt index (debtIndex) is NOT the APR, but rather a cumulative tracker of interest accrual over time.do
        // TODO fix the interestAccrued calculation, it should be linear not exponential
        // uint interestAccrued = (borrowingRate * timeElapsed * debtIndex) / (DECIMALS * ONE_YEAR);
        // debtIndex = debtIndex + interestAccrued;
        uint interestAccrued = (borrowingRate * timeElapsed) / ONE_YEAR;
        debtIndex = (debtIndex * (DECIMALS + interestAccrued)) / DECIMALS;
        lastUpdateTimestamp = block.timestamp;
        emit DebtIndexUpdated(debtIndex);
        return debtIndex;
    }

    /**
     * @notice Retrieves the total debt accrued by a user in terms of debt tokens.
     * @param user The address of the user.
     * @return The total debt accrued as a `uint`.
     */
    function getTotalDebtAccrued(address user) public view returns (uint) {
        return balanceOf(user);
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
}