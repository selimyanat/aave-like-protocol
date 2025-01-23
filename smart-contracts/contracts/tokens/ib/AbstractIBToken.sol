// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

/**
When using interest-bearing tokens (IBToken) for lenders and debt tokens for borrowers, the yield distribution to 
lenders is handled implicitly through the increasing exchange rate of the IBToken. You do not need to explicitly 
distribute yield manually because the exchange rate mechanics already incorporate the accrued interest, ensuring 
that lenders' tokens automatically reflect their share of the pool.
 */

abstract contract AbstractIBToken is ERC20 {

    uint public constant DECIMALS = 1e18;

    uint public constant ONE_YEAR = 365 days;

    // The exchange rate defines the value of one IBT in terms of the underlying asset. It reflects the accrued interest 
    // and the growth of the underlying asset pool. As the exchange rate appreciates, each IBT becomes redeemable for a 
    // larger amount of the underlying asset.
    uint public exchangeRate;

    uint public initialExchangeRate;

    uint public lastUpdateTimestamp;

    event ExchangeRateUpdated(uint newExchangeRate);

    constructor(string memory name, string memory symbol, uint _exchangeRate) ERC20(name, symbol) {
        initialExchangeRate = _exchangeRate;
        exchangeRate = _exchangeRate;
        lastUpdateTimestamp = block.timestamp;
    }

    function mint(address account, uint amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint amount) external {
        _burn(account, amount);
    }

    function recalculateExchangeRate(uint lendingRate) external returns (uint) {   
        // New Exchange Rate = Current Exchange Rate * (1 + Interest Accrued)
        uint timeElapsed = getElapsedTime();
        uint interestAccrued = lendingRate * timeElapsed / ONE_YEAR;
        exchangeRate = (exchangeRate * (DECIMALS + interestAccrued)) / DECIMALS;
        lastUpdateTimestamp = block.timestamp;
        emit ExchangeRateUpdated(exchangeRate);
        return exchangeRate;
    }

    function getExchangeRate() public view returns (uint) {
        return exchangeRate;
    }

    function getInitialExchangeRate() public view returns (uint) {
        return initialExchangeRate;
    }

    function getElapsedTime() public view virtual returns (uint) {
        return block.timestamp - lastUpdateTimestamp;
    }

    function _beforeTokenTransfer(address from,address to, uint256 amount) internal pure override {
        // Allow minting and burning but disallow transfers between non-zero addresses for now ??
        require(
            from == address(0) || to == address(0),
            "Interests bearing tokens are non-transferable"
        );
    }

}