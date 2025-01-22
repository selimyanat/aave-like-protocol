// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./IBToken.sol";
import "./LendingRate.sol";
import "./BorrowingRate.sol";
import "./DebtToken.sol";
import "./TradableToken.sol";
import "./OracleGateway.sol";
import "./ProtocolReserve.sol";
import "hardhat/console.sol";

contract Pool {

    uint public constant DECIMALS = 1e18;

    TradableToken public tradableToken;

    IBToken public ibToken;

    DebtToken public debtToken;

    LendingRate public lendingRate;

    BorrowingRate public borrowingRate;

    OracleGateway public oracleGateway;

    ProtocolReserve public protocolReserve;

    uint public totalLiquidity;

    uint public totalBorrows;

    uint public collateralFactor;

    uint public liquidationThreshold;

    uint public liquidationPenaltyRate;

    // TODO PERHAPS NO NEED FOR THIS GIVEN THE EXISTENCE OF THE IB TOKEN
    mapping (address => uint) depositAmounts;

    // TODO PERHAPS NO NEED FOR THIS GIVEN THE EXISTENCE OF THE DEBT TOKEN
    mapping (address => uint) borrowAmounts;

    mapping(address => uint256) public collateralBalances;

    event DepositAdded(address indexed depositor, address token, uint amount, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event FundsWithdrawn(address indexed depositor, uint depositWithInterests, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event Borrowing(address indexed borrower, uint amount, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event Repayment(address indexed borrower, uint amount, uint collateralToReturn, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    event Liquidation(address indexed borrower, address indexed liquidator, uint amount, uint liquidationPenalty, uint remainingCollateral, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    constructor(address _tradableToken, address _ibToken, address _lendingRate, address _borrowingRate, address _debtToken, address _oracleGateway, address _protocolReserve, uint  _collateralFactor, uint _liquidationThreshold, uint _liquidationPenaltyRate) {

        tradableToken = TradableToken(_tradableToken);        
        lendingRate = LendingRate(_lendingRate);
        borrowingRate = BorrowingRate(_borrowingRate);
        oracleGateway = OracleGateway(_oracleGateway);
        protocolReserve = ProtocolReserve(_protocolReserve);
        collateralFactor = _collateralFactor;
        liquidationPenaltyRate = _liquidationPenaltyRate;
        liquidationThreshold = _liquidationThreshold;
        ibToken = IBToken(_ibToken);
        debtToken = DebtToken(_debtToken);
    }

    function deposit(uint256 _amount) public {

        //  the update of IBtoken exchange rate is optional as IBToken holders benefit indirectly, as deposits 
        // don’t change accrued interest or liquidity. Should not update the debt token index rate
        // New deposits may increase liquidity, which can lower utilization and impact borrowing/lending rates.
        // The exchange rate represents the growth of the underlying pool due to accrued interest from borrowers, not 
        // the total supply of IBTokens or new deposits.
        // Adding new liquidity (deposits) does not directly affect the accrued interest or pool growth.
        require(_amount > 0, "The deposit must be greater than 0");
        //console.log("getting exchange rate");
        totalLiquidity += _amount;        
        
        // TEST ME
        depositAmounts[msg.sender] += _amount; 
            
        uint exchangeRate = ibToken.getExchangeRate();

        uint ibTokenAmount = _amount * exchangeRate / DECIMALS;
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendingRate = lendingRate.recalculateLendingRate(_borrowingRate);
        // Optional: If the pool has accrued interest over a long period and the exchange rate hasn’t been updated, it’s fair 
        // to update the exchange rate to reflect this accrued interest before minting new IBTokens.
        // In protocols where the exchange rate reflects time-weighted accruals (even without repayments), updating it 
        // ensures consistency across all operations.
        ibToken.recalculateExchangeRate(_lendingRate);
        tradableToken.transferFrom(msg.sender, address(this), _amount);
        ibToken.mint(msg.sender, ibTokenAmount);
        emit DepositAdded(msg.sender, address(tradableToken), _amount, totalLiquidity, totalBorrows, _utilizationRate);
    }

    function fullWithdraw(uint _amount) public  {
        // IBToken exchange rate may need adjustment to ensure accurate withdrawal calculations. debt token 
        // index rate should not be updated
        // Large withdrawals reduce liquidity, increasing utilization and potentially affecting rates.
        // Borrowers' outstanding debt, however, is unchanged by withdrawals since it is determined by:
        // The principal borrowed and The accrued interest (tracked by the debt token index).
        // Therefore, there is no need to update the debt token during a withdrawal.

        // Recalculate exchange rate before calculating the amount to be withdrawn
        uint _lendingRate = lendingRate.getLendingRate();
        // update the exchange rate before calculating the amount to be withdrawn, in case no operation has been done
        // for a long time. The exchange rate should reflect the accrued interest
        ibToken.recalculateExchangeRate(_lendingRate);//
        uint depositWithInterests = ibToken.balanceOf(msg.sender) * ibToken.getExchangeRate() / DECIMALS;
        require(totalLiquidity >= depositWithInterests, "The amount of token and interests cannot be withdrawn, because of insufficient liquidity");
        totalLiquidity -= depositWithInterests;

        // TESTME is it still useful ???
        depositAmounts[msg.sender] = 0;  

        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendinglendingRate = lendingRate.recalculateLendingRate(_borrowingRate);
        ibToken.recalculateExchangeRate(_lendinglendingRate);
        tradableToken.transfer(msg.sender, depositWithInterests);         
        uint ibTokenEarned = ibToken.balanceOf(msg.sender);
        ibToken.burn(msg.sender, ibTokenEarned);
        console.log("SY - balance of ibToken %s", ibTokenEarned);                
        emit FundsWithdrawn(msg.sender, depositWithInterests, totalLiquidity, totalBorrows, _utilizationRate);
    }

    function borrow(uint _amount) public payable {
        // no need to update the IBToken exchnage rate, only the debt token is updated:
        // Borrowing increases debt, so the debt index must reflect all accrued interest before adding new debt.
        // Borrowing increases utilization, raising the borrowing and lending rates.
        // The IBToken exchange rate grows based on interest accrued by borrowers over time. Borrowing itself does not 
        // immediately contribute to accrued interest; it only increases the utilization rate, which influences future 
        // interest accrual through the lending rate.
        // The exchange rate remains unchanged during borrowing since no interest has yet been paid.
        require(_amount > 0, "The amount of token borrowed must be greater than 0");
        require(totalLiquidity >= _amount, "The amount of token borrowed must be less than the available liquidity");        
        require(msg.value > 0, "The amount of token borrowed must have a collateral");

        uint collateralPrice = oracleGateway.getCollateralPriceInTradableToken();
        uint collateralRatio = getCollateralRatio(msg.value, _amount, collateralPrice);
        console.log("BORROW - collateralRatio %s", collateralRatio);
        console.log("BORROW - collateralFactor %s", collateralFactor);
        require(collateralRatio >= collateralFactor, "The collateral ratio must be greater or equal than the collateral factor");

        uint healthFactor = getHealthFactor(msg.sender, _amount, msg.value, collateralPrice);
        require(healthFactor >= 1e18, "The borrower health factor must be greater than 1 to allow the borrowing");

        borrowAmounts[msg.sender] += _amount;
        
        collateralBalances[msg.sender] += msg.value;
        totalBorrows += _amount;
        totalLiquidity -= _amount;

        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate = borrowingRate.recalculateBorrowingRate(_utilizationRate);        
        lendingRate.recalculateLendingRate(_borrowingRate);
        debtToken.recalculateDebtIndex(_borrowingRate);        
        uint debtTokenIndex = debtToken.getDebtIndex();        
        uint debtTokenAmount = _amount * debtTokenIndex / DECIMALS;
        console.log("BORROW - recalculate debt index %s", debtTokenIndex);
        console.log("BORROW - debtTokenAmount %s", debtTokenAmount);
        debtToken.mint(msg.sender, debtTokenAmount);        
        tradableToken.transfer(msg.sender, _amount);
        console.log("BORROW - total accrued interests %s", debtToken.balanceOf(msg.sender));
        emit Borrowing(msg.sender, _amount, totalLiquidity, totalBorrows, _utilizationRate);
    }


    function fullRepay() public {

        // Both the IBToken exchange rate and debt index must reflect accrued interest before adjusting balances.
        // the protocol should keep a part of the interest to be distributed to the lenders as a fee
        // Same as befeore, the debt index must reflect all accrued interest before adjusting balances.
        uint borrowerDebt = debtToken.balanceOf(msg.sender);
        require(borrowerDebt > 0, "The borrower has no debt to repay");
        uint _borrowingRate = borrowingRate.getBorrowingRate();
        debtToken.recalculateDebtIndex(_borrowingRate);
        uint debtWithInterests = borrowerDebt * debtToken.getDebtIndex() / DECIMALS; 

        // FEES:  Calculate interest and reserve fee
        uint interest = debtWithInterests - borrowerDebt;
        uint fee = (interest * lendingRate.reserveFactor()) / DECIMALS;
        // Add fee to protocol reserve
        //protocolReserve += fee;

        totalBorrows -= borrowAmounts[msg.sender];
        
        // FEES: Subtract fee from total liquidity
        uint netRepayment = debtWithInterests - fee;
        //totalLiquidity += debtWithInterests;
        totalLiquidity += netRepayment;

        borrowAmounts[msg.sender] = 0;
        uint collateralToReturn = collateralBalances[msg.sender]; 
        collateralBalances[msg.sender] = 0; 

        // recalculate the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate2 = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendingRate2 = lendingRate.recalculateLendingRate(_borrowingRate2);
        // Updated during repayment to ensure the borrower’s debt reflects all accrued interest.
        debtToken.recalculateDebtIndex(_borrowingRate2);
        // Updated to reflect increased pool liquidity due to interest paid.
        ibToken.recalculateExchangeRate(_lendingRate2);
        // Returns collateral to the borrower
        console.log("REPAY - collateral to return %s", collateralToReturn);
        payable(msg.sender).transfer(collateralToReturn);

        // the borrower must allows the protocol to transfer the amount with interests
        uint allowance = tradableToken.allowance(msg.sender, address(this));
        require(debtWithInterests == allowance, "The amount of token allowed to repay the debt is insufficient to cover the debt with the interests");
        console.log("REPAY - NET REPAYMENT %s", netRepayment);
        console.log("REPAY - DEBT INDEX AFTER UPDATE %s", debtToken.getDebtIndex());
        console.log("REPAY - allowance %s", allowance); 
        console.log("REPAY - fee %s", fee); 
        //require(netRepayment <= allowance, "The amount of token allowed to repay the debt is insufficient to cover the debt with the interests");
        tradableToken.transferFrom(msg.sender, address(this), debtWithInterests);
        // Approve the reserve contract to pull the fee
        tradableToken.approve(address(protocolReserve), fee);
        protocolReserve.collectTradabelTokenFee(fee);
        
        // burn the debt token
        uint debtTokenAmount = debtToken.balanceOf(msg.sender);
        debtToken.burn(msg.sender, debtTokenAmount);

        //emit Repayment(msg.sender, debtWithInterests, collateralToReturn, totalLiquidity, totalBorrows, _utilizationRate);
        // add the reserve factor
        emit Repayment(msg.sender, netRepayment, collateralToReturn, totalLiquidity, totalBorrows, _utilizationRate);        
    }

    function liquidate(address borrower) public {

        console.log("LIQUIDATE - total liquidity before liquidation %s", totalLiquidity);

        //Liquidation adjusts both pool liquidity and borrower debt, so both values must be updated.
        uint borrowerDebtInToken = debtToken.balanceOf(borrower);
        require(borrowerDebtInToken > 0, "The borrower has no debt to liquidate");

        // verify that the health factor is above or equal the liquidation threshold
        uint collateralPrice = oracleGateway.getCollateralPriceInTradableToken();
        uint healthFactor = getHealthFactor(borrower, collateralPrice);
        require(healthFactor < 1e18, "The borrower is not liquidatable, because the health factor is safe");

        // calculate the amount to be repaid to the lender
        uint _borrowingRate = borrowingRate.getBorrowingRate();
        debtToken.recalculateDebtIndex(_borrowingRate);
        uint debtWithInterests = borrowerDebtInToken * debtToken.getDebtIndex() / DECIMALS;
        console.log("LIQUIDATE - DEBT WITH INTERESTS %s", debtWithInterests);

        totalBorrows -= borrowAmounts[borrower];
        totalLiquidity += debtWithInterests;
        borrowAmounts[msg.sender] = 0;
        // A liquidation fee is applied to the seized collateral, for simplicity 100% of the collateral is seized
        // TODO perhaps shoudl retain a fee by the protocol
        uint collateralToSeize = collateralBalances[borrower]; 
        collateralBalances[borrower] = 0; 

        // Calculate the liquidation penalty (e.g., 10% of the total collateral)
        uint liquidationPenalty = (collateralToSeize * liquidationPenaltyRate) / DECIMALS;
        uint remainingCollateral = collateralToSeize - liquidationPenalty;

        // Ensure sufficient collateral: in case the liquidation penalty pourcentage is too high like > 100%
        require(liquidationPenalty <= collateralToSeize, "Insufficient collateral to apply penalty");

        // recalculate the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate2 = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendingRate2 = lendingRate.recalculateLendingRate(_borrowingRate2);

        // The protocol must update the debt index to ensure all borrowers’ debt balances reflect the latest accrued interest before reducing the liquidated borrower’s debt.
        debtToken.recalculateDebtIndex(_borrowingRate2);
        // The updated exchange rate ensures that all lenders’ IBTokens reflect the pool’s new value, including the added liquidity from the liquidation.
        ibToken.recalculateExchangeRate(_lendingRate2);
        
        // Transfer protocol fee to the reserve
        //protocolReserve.collectETHFee{value: protocolFee}();

        // // Transfer remaining collateral to the borrower
        //console.log("LIQUIDATION - collateral to seize and return %s", collateralToSeize);
        //payable(msg.sender).transfer(collateralToSeize);
        // Transfer liquidation penalty to the liquidator
        console.log("LIQUIDATION -transfer collateral to liquidator %s", liquidationPenalty);
        payable(msg.sender).transfer(liquidationPenalty);            
        // Return remaining collateral to the borrower
        if (remainingCollateral > 0) {
            console.log("LIQUIDATION - transfer remaining collateral to borrower %s", remainingCollateral);
            payable(borrower).transfer(remainingCollateral);
        }
        
        // the liquidator must allows the protocol to transfer the amount with interests        
        uint allowance = tradableToken.allowance(msg.sender, address(this));
        console.log("LIQUIDATE - DEBT WITH INTERESTS %s", debtWithInterests);
        console.log("LIQUIDATE - allowance %s", allowance); 
        require(debtWithInterests == allowance, "The amount of token sent to liquidate the debt is insufficient to cover the debt with the interests");

        tradableToken.transferFrom(msg.sender, address(this), debtWithInterests);

        // burn the debt token
        debtToken.burn(borrower, borrowerDebtInToken);

        emit Liquidation(borrower, msg.sender, debtWithInterests, liquidationPenalty, remainingCollateral, totalLiquidity, totalBorrows, _utilizationRate);
    }

    // TODO include the reserve factor calculation when a borrower repay its loan. Part of it should be kept by the protocol
    // I think it is part of the borrowing rrecalculateBorrowingRateeady
    function getUtilizationRate() public view returns (uint) {

        // High utilization results in high borrowing and lending rates, incentivizing lenders to deposit more liquidity.
        if (totalLiquidity == 0) {
            return 0;
        }
        return (totalBorrows * DECIMALS)/ (totalLiquidity + totalBorrows);
    }

    function getCollateralRatio(uint collateralAmount, uint borrowedAmount, uint collateralPrice) internal pure returns (uint) {
        uint collateralValue = collateralPrice * collateralAmount / DECIMALS;
        console.log("SY - collateralValue %s", collateralValue);
        console.log("SY - borrowedAmount %s", borrowedAmount);
        uint collateralRatio = (collateralValue * DECIMALS)/ borrowedAmount;
        return collateralRatio;
    }

    function getHealthFactor(address borrower, uint newBorrowedAmount, uint newCollateralAmount, uint collateralPrice) internal view returns (uint) {

        uint totalDebtValue = borrowAmounts[borrower] + newBorrowedAmount;
        require(totalDebtValue > 0, "No debt to calculate health factor");
        // TODO perhaps rename this loanToValue ???
        uint totalCollateralValue =  (collateralBalances[borrower] + newCollateralAmount) * collateralPrice / 1e18;
        console.log("total collateral value: %s", totalCollateralValue);
        console.log("total debt value: %s", totalDebtValue);
        uint healthFactor = (totalCollateralValue * liquidationThreshold) / totalDebtValue;
        console.log("health factor: %s", healthFactor);
        return healthFactor;
    }

    function getHealthFactor(address borrower, uint collateralPrice) internal view returns (uint) {
        uint totalDebtValue = borrowAmounts[borrower];
        require(totalDebtValue > 0, "No debt to calculate health factor");
        uint totalCollateralValue =  collateralBalances[borrower]  * collateralPrice / 1e18;
        console.log("total collateral value: %s", totalCollateralValue);
        console.log("total debt value: %s", totalDebtValue);
        uint healthFactor = (totalCollateralValue * liquidationThreshold) / totalDebtValue;
        console.log("health factor: %s", healthFactor);
        return healthFactor;
    }
}