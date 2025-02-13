// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../rates/LendingRate.sol";

/**
 * @title AbstractIBToken
 * @dev Abstract implementation of an interest-bearing token (IBToken) for lenders in a lending protocol.
 * The IBToken reflects the yield distribution implicitly through an increasing exchange rate, ensuring that
 * lenders' balances automatically reflect their share of the pool's growth without explicit yield distribution.
 */
abstract contract AbstractIBToken is ERC20 {

    /// @notice Decimal precision used for fixed-point calculations (1e18).
    uint public constant DECIMALS = 1e18;

    /// @notice Number of seconds in one year, used for annualized interest calculations.
    uint public constant ONE_YEAR = 365 days;

    /// @notice The contract managing the lending rate for depositors.
    LendingRate public lendingRate;

    /// @notice Current exchange rate of the IBToken in terms of the underlying asset.
    /// @dev Reflects the accrued interest and pool growth.
    uint public exchangeRate;

    /// @notice Mapping to store the lender exchange rate at the time of deposit for each lender.
     mapping(address => uint) public lenderExchangeRate;

    /// @notice Initial exchange rate set during contract deployment.
    uint public initialExchangeRate;

    /// @notice The timestamp of the last update to the exchange rate.
    uint public lastUpdateTimestamp;

    /// @dev Emitted when the exchange rate is updated.
    /// @param newExchangeRate The newly calculated exchange rate.
    event ExchangeRateUpdated(uint newExchangeRate);

    /**
     * @notice Initializes the IBToken with a name, symbol, and initial exchange rate.
     * @param name The name of the IBToken.
     * @param symbol The symbol of the IBToken.
     * @param _exchangeRate The initial exchange rate of the IBToken in terms of the underlying asset.
     * @param _lendingRate The address of the LendingRate contract managing the lending rate.
     */
    constructor(string memory name, string memory symbol, uint _exchangeRate, address _lendingRate) ERC20(name, symbol) {
        initialExchangeRate = _exchangeRate;
        exchangeRate = _exchangeRate;
        lastUpdateTimestamp = block.timestamp;
        lendingRate = LendingRate(_lendingRate);
    }

    /**
     * @notice Mints IBTokens to a specified account.
     * @param lender The address of the account to receive the tokens.
     * @param amount The amount of IBTokens to mint.
     */
    function mint(address lender, uint amount) external {

        if (balanceOf(lender) == 0) {
            // Store the borrower's debt index at borrowing time
            lenderExchangeRate[lender] = exchangeRate;
        } 
        // TODO: when a lender takes a second load we need to update lender's exchange rate
        // using weighted average formula. This ensures fair interest accrual for multiple 
        // deposits.
        _mint(lender, amount);
    }

    /**
     * @notice Burns IBTokens from a specified account.
     * @param lender The address of the account to burn the tokens from.
     * @param amount The amount of IBTokens to burn.
     */
    function burn(address lender, uint amount) external {
        // Reset the lender's  index when their deposit is fully withdrawn
        lenderExchangeRate[lender] = 0;
        _burn(lender, amount);
    }

    /**
     * @notice Recalculates the IBToken exchange rate ,including compounding, based on 
     * the provided lending rate and elapsed time.
     * @dev The exchange rate is updated to reflect the accrued interest:
     *      New Exchange Rate = Current Exchange Rate × (1 + Interest Accrued)
     *      Interest Accrued = Lending Rate × Time Elapsed / ONE_YEAR
     * Emits an `ExchangeRateUpdated` event.
     * @return The updated exchange rate.
     */
    function recalculateExchangeRate() external returns (uint) {   
        uint timeElapsed = getElapsedTime();
        uint accruedInterest = lendingRate.getLendingRate() * timeElapsed / ONE_YEAR;
        // exponential growth
        exchangeRate = (exchangeRate * (DECIMALS + accruedInterest)) / DECIMALS;
        lastUpdateTimestamp = block.timestamp;
        emit ExchangeRateUpdated(exchangeRate);
        return exchangeRate;
    }

    /**
     * @notice Returns the current exchange rate of the IBToken.
     * @return The current exchange rate as a `uint`.
     */
    function getExchangeRate() public view returns (uint) {
        return exchangeRate;
    }

    /**
     * @notice Returns the initial exchange rate of the IBToken set at deployment.
     * @return The initial exchange rate as a `uint`.
     */
    function getInitialExchangeRate() public view returns (uint) {
        return initialExchangeRate;
    }

    /**
     * @notice Returns the time elapsed since the last exchange rate update.
     * @return The elapsed time, in seconds, as a `uint`.
     */
    function getElapsedTime() public view virtual returns (uint) {
        return block.timestamp - lastUpdateTimestamp;
    }

    /**
     * @dev Overrides `_beforeTokenTransfer` to make IBTokens non-transferable for now.
     * Allows minting and burning but disallows transfers between non-zero addresses.
     * @param from The address initiating the transfer.
     * @param to The address receiving the transfer.
     * @param amount The amount of tokens being transferred.
     */
    function _beforeTokenTransfer(address from,address to, uint256 amount) internal pure override {
        // Allow minting and burning but disallow transfers between non-zero addresses for now ??
        require(
            from == address(0) || to == address(0),
            "Interests bearing tokens are non-transferable"
        );
    }

    /**
     * @dev Retrieves the exchange rate at the time of lending for a specific lender.
     * @param lender The address of the lender.
     * @return The exchange rate at the time of lending for the specified lender.
     */
    function getLenderExchangeRateAtLending(address lender) public view returns (uint) {
        return lenderExchangeRate[lender];
    }
}