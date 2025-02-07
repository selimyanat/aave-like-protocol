// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../tokens/ib/IBToken.sol";
import "../rates/LendingRate.sol";
import "../rates/BorrowingRate.sol";
import "../tokens/debt/DebtToken.sol";
import "../tokens/TradableToken.sol";
import "../oracle/OracleGateway.sol";
import "../pool/ProtocolReserve.sol";

/**
 * @title Pool
 * @dev Core contract for the lending protocol, managing deposits, withdrawals, borrowing, repayment, and liquidation.
 * The Pool integrates interest-bearing tokens (IBTokens) for lenders, debt tokens (DebtToken) for borrowers, and handles collateralized lending using ETH as collateral.
 */
contract Pool is ReentrancyGuard {

    /// @notice Decimal precision used for calculations (1e18).
    uint public constant DECIMALS = 1e18;

    /// @notice The minimum health factor required for a borrower to borrow from the pool.
    uint public constant SAFE_HEALTH_FACTOR = 1e18;

    /// @notice The tradable ERC20 token supported by the pool.
    TradableToken public tradableToken;

    /// @notice The interest-bearing token (IBToken) used to represent deposits.
    IBToken public ibToken;

    /// @notice The debt token (DebtToken) used to track borrower obligations.
    DebtToken public debtToken;

    /// @notice The contract managing the lending rate for depositors.
    LendingRate public lendingRate;

    /// @notice The contract managing the borrowing rate for borrowers.
    BorrowingRate public borrowingRate;

    /// @notice The contract providing price feeds for collateral assets.
    OracleGateway public oracleGateway;

    /// @notice The protocol's reserve contract to manage protocol fees.
    ProtocolReserve public protocolReserve;

    /// @notice Total liquidity in the pool, representing deposited assets available for borrowing.
    uint public totalLiquidity;

    /// @notice Total borrowed amount across all borrowers.
    uint public totalBorrows;

    /// @notice The collateral factor, determining how much collateral is required to borrow.
    uint public collateralFactor;

    /// @notice The liquidation threshold, determining when a borrower is eligible for liquidation.
    uint public liquidationThreshold;

    /// @notice The liquidation penalty rate applied during liquidation.
    uint public liquidationPenaltyRate;

    /// @notice Mapping of collateral balances for each borrower.
    mapping(address => uint256) public collateralBalances;

    /// @dev Emitted when a user deposits into the pool.
    event DepositAdded(address indexed depositor, address token, uint amount, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    /// @dev Emitted when a user withdraws their deposit from the pool.
    event FundsWithdrawn(address indexed depositor, uint depositWithInterests, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    /// @dev Emitted when a borrower borrows from the pool.
    event Borrowing(address indexed borrower, uint amount, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    /// @dev Emitted when a borrower repays their loan.
    event Repayment(address indexed borrower, uint amount, uint collateralToReturn, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    /// @dev Emitted when a borrower is liquidated.
    event Liquidation(address indexed borrower, address indexed liquidator, uint amount, uint liquidationPenalty, uint remainingCollateral, uint totalLiquidity, uint totalBorrows, uint utilizationRate);

    /**
     * @notice Deploys the Pool contract.
     * @param _tradableToken Address of the tradable token (ERC20) used in the protocol.
     * @param _ibToken Address of the IBToken contract.
     * @param _lendingRate Address of the LendingRate contract.
     * @param _borrowingRate Address of the BorrowingRate contract.
     * @param _debtToken Address of the DebtToken contract.
     * @param _oracleGateway Address of the OracleGateway contract.
     * @param _protocolReserve Address of the ProtocolReserve contract.
     * @param _collateralFactor Collateral factor for borrowing, scaled by `DECIMALS`.
     * @param _liquidationThreshold Liquidation threshold for borrowers, scaled by `DECIMALS`.
     * @param _liquidationPenaltyRate Liquidation penalty rate, scaled by `DECIMALS`.
     */
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

    /**
     * @notice Deposits tradable tokens into the pool and mints IBTokens for the depositor.
     * @param _amount The amount of tradable tokens to deposit.
     */
    function deposit(uint256 _amount) public nonReentrant {

        require(_amount > 0, "The deposit must be greater than 0");
        totalLiquidity += _amount; 

        // Calculate the amount of IBTokens to mint
        // Get fresh exchange rate, as we only update the exchange rat when the lender deposits, withdraws or during liquidation
        ibToken.recalculateExchangeRate(lendingRate.getLendingRate());
        uint exchangeRate = ibToken.getExchangeRate();
        uint ibTokenAmount = _amount * exchangeRate / DECIMALS;

        // Make the transfer(s)
        ibToken.mint(msg.sender, ibTokenAmount);
        tradableToken.transferFrom(msg.sender, address(this), _amount);        

        // Update the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendingRate = lendingRate.recalculateLendingRate(_borrowingRate);
        ibToken.recalculateExchangeRate(_lendingRate);
        
        emit DepositAdded(msg.sender, address(tradableToken), _amount, totalLiquidity, totalBorrows, _utilizationRate);
    }

    /**
     * @notice Allows users to withdraw their deposits with accrued interest.
     */
    function withdraw() public nonReentrant {

        uint ibTokenAmount = ibToken.balanceOf(msg.sender);
        require(ibTokenAmount > 0, "No funds to withdraw");

        // Calculate the amount to be withdrawn: deposit + interest
        // Get fresh exchange rate, as we only update the exchange rat when the lender deposits, withdraws or during liquidation
        ibToken.recalculateExchangeRate(lendingRate.getLendingRate());//
        uint depositWithInterests = (ibTokenAmount * ibToken.getExchangeRate()) / ibToken.getLenderExchangeRateAtLending(msg.sender);
        require(totalLiquidity >= depositWithInterests, "The amount of token and interests cannot be withdrawn, because of insufficient liquidity");
        totalLiquidity -= depositWithInterests;

        // Udpate the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendinglendingRate = lendingRate.recalculateLendingRate(_borrowingRate);
        ibToken.recalculateExchangeRate(_lendinglendingRate);

        // Make the transfer(s)
        ibToken.burn(msg.sender, ibTokenAmount);
        tradableToken.transfer(msg.sender, depositWithInterests);         
        emit FundsWithdrawn(msg.sender, depositWithInterests, totalLiquidity, totalBorrows, _utilizationRate);
    }

    /**
     * @notice Allows a user to borrow tokens using ETH as collateral.
     * @param _amount The amount of tradable tokens to borrow.
     */
    function borrow(uint _amount) public payable nonReentrant{

        require(_amount > 0, "The amount of token borrowed must be greater than 0");
        require(totalLiquidity >= _amount, "The amount of token borrowed must be less than the available liquidity");        
        require(msg.value > 0, "The amount of token borrowed must have a collateral");

        // Check the collateral ratio and the health factor
        uint collateralPrice = oracleGateway.getCollateralPrice();
        uint collateralRatio = getCollateralRatio(msg.value, _amount, collateralPrice);
        require(collateralRatio >= collateralFactor, "The collateral ratio must be greater or equal than the collateral factor");
        uint healthFactor = getHealthFactor(msg.sender, _amount, msg.value, collateralPrice);
        require(healthFactor >= SAFE_HEALTH_FACTOR, "The borrower health factor must be greater than 1 to allow the borrowing");        
        collateralBalances[msg.sender] += msg.value;
        totalBorrows += _amount;
        totalLiquidity -= _amount;
        
        // Make the transfer(s)
        // Get fresh debt token index, as we only update the debt index when the borrower borrows, repays or get liquidated
        debtToken.recalculateDebtIndex(borrowingRate.getBorrowingRate());
        uint debtTokenIndex = debtToken.getDebtIndex();
        uint debtTokenAmount = (_amount * debtTokenIndex) / DECIMALS; 
        debtToken.mint(msg.sender, debtTokenAmount);        
        tradableToken.transfer(msg.sender, _amount);

        // Udpate the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate = borrowingRate.recalculateBorrowingRate(_utilizationRate);        
        lendingRate.recalculateLendingRate(_borrowingRate);
        debtToken.recalculateDebtIndex(_borrowingRate);   

        emit Borrowing(msg.sender, _amount, totalLiquidity, totalBorrows, _utilizationRate);
    }


    /**
     * @notice Allows a borrower to repay their outstanding debt, including accrued interest.
     * @dev Updates the debt index, redistributes fees to the protocol reserve, and returns collateral to the borrower.
     * @dev Borrowers must approve the protocol to spend the repayment amount before calling this function.
     */
    function repay() public nonReentrant {

        uint debtTokenAmount = debtToken.balanceOf(msg.sender);
        require(debtTokenAmount > 0, "The borrower has no debt to repay");
                
        uint fromTokenToAmountBorrowed = (debtTokenAmount * DECIMALS) / debtToken.getDebtIndexAtBorrowing(msg.sender);
        totalBorrows -= fromTokenToAmountBorrowed;

        // Get fresh debt token index, as we only update the debt index when the borrower borrows, repays or get liquidated
        debtToken.recalculateDebtIndex(borrowingRate.getBorrowingRate()); 
        uint debtWithInterests = (debtTokenAmount * debtToken.getDebtIndex()) / debtToken.getDebtIndexAtBorrowing(msg.sender); 
        uint interest = debtWithInterests - debtTokenAmount;        
        uint fee = (interest * lendingRate.reserveFactor()) / DECIMALS;        
        uint netRepayment = debtWithInterests - fee;
        totalLiquidity += netRepayment;
        uint collateralToReturn = collateralBalances[msg.sender]; 
        collateralBalances[msg.sender] = 0; 
               
        // Make the transfer(s)        
        uint allowance = tradableToken.allowance(msg.sender, address(this));
        require(debtWithInterests == allowance, "The amount of token to repay the debt must be equal to borrowed amount including the interests");
        tradableToken.transferFrom(msg.sender, address(this), debtWithInterests);
        tradableToken.approve(address(protocolReserve), fee);        
        protocolReserve.collectTradabelTokenFee(fee);
        debtToken.burn(msg.sender, debtTokenAmount);
        payable(msg.sender).transfer(collateralToReturn);

        // Udpate the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate2 = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendingRate2 = lendingRate.recalculateLendingRate(_borrowingRate2);
        debtToken.recalculateDebtIndex(_borrowingRate2);
        ibToken.recalculateExchangeRate(_lendingRate2);

        emit Repayment(msg.sender, netRepayment, collateralToReturn, totalLiquidity, totalBorrows, _utilizationRate);        
    }

    /**
     * @notice Liquidates a borrower who has fallen below the liquidation threshold.
     * @dev Transfers a portion of the borrower’s collateral to the liquidator as a reward and returns any remaining collateral to the borrower.
     * @dev The liquidator must repay the borrower’s outstanding debt, including accrued interest.
     * @param _borrower The address of the borrower being liquidated.
     */
    function liquidate(address _borrower) public nonReentrant {

        // TODO actually could be the debt token address for instance ?
        require(_borrower != address(0), "Invalid borrower address");
        uint borrowerDebtInToken = debtToken.balanceOf(_borrower);
        require(borrowerDebtInToken > 0, "The borrower has no debt to liquidate");

        // Calculate the amount to be repaid and incentives for the liquidator
        uint collateralPrice = oracleGateway.getCollateralPrice();
        uint healthFactor = getHealthFactor(_borrower, collateralPrice);
        require(healthFactor < SAFE_HEALTH_FACTOR, "The borrower is not liquidatable, because the health factor is safe");

        uint debtTokenAmount = debtToken.balanceOf(_borrower);
        uint fromTokenToAmountBorrowed = (debtTokenAmount * DECIMALS) / debtToken.getDebtIndexAtBorrowing(_borrower);
        totalBorrows -= fromTokenToAmountBorrowed;

        // Get fresh debt token index, as we only update the debt index when the borrower borrows, repays or get liquidated
        debtToken.recalculateDebtIndex(borrowingRate.getBorrowingRate()); 
        uint debtWithInterests = (debtTokenAmount * debtToken.getDebtIndex()) / debtToken.getDebtIndexAtBorrowing(_borrower); 
        totalLiquidity += debtWithInterests;
        uint collateralToSeize = collateralBalances[_borrower]; 
        collateralBalances[_borrower] = 0; 
        uint liquidationPenalty = (collateralToSeize * liquidationPenaltyRate) / DECIMALS;
        uint remainingCollateral = collateralToSeize - liquidationPenalty;
        require(liquidationPenalty <= collateralToSeize, "Insufficient collateral to apply penalty");

        // Make the transfer(s)        
        uint allowance = tradableToken.allowance(msg.sender, address(this));
        require(debtWithInterests == allowance, "The amount of token to repay the debt must be equal to borrowed amount including the interests");
        debtToken.burn(_borrower, borrowerDebtInToken);
        tradableToken.transferFrom(msg.sender, address(this), debtWithInterests);
        payable(msg.sender).transfer(liquidationPenalty);            
        if (remainingCollateral > 0) {
            payable(_borrower).transfer(remainingCollateral);
        }

       // Udpate the rates
        uint _utilizationRate = getUtilizationRate();
        uint _borrowingRate2 = borrowingRate.recalculateBorrowingRate(_utilizationRate);
        uint _lendingRate2 = lendingRate.recalculateLendingRate(_borrowingRate2);
        debtToken.recalculateDebtIndex(_borrowingRate2);
        ibToken.recalculateExchangeRate(_lendingRate2);
        emit Liquidation(_borrower, msg.sender, debtWithInterests, liquidationPenalty, remainingCollateral, totalLiquidity, totalBorrows, _utilizationRate);
    }
    
    /**
     * @notice Calculates the pool’s utilization rate.
     * @dev The utilization rate is defined as:
     *      Utilization Rate = Total Borrows / (Total Liquidity + Total Borrows)
     * @return The utilization rate as a percentage scaled by `DECIMALS`.
     */
    function getUtilizationRate() public view returns (uint) {

        if (totalLiquidity == 0) {
            return 0;
        }
        return (totalBorrows * DECIMALS)/ (totalLiquidity + totalBorrows);
    }

    /**
     * @notice Calculates the collateral ratio for a given amount of collateral and borrowed tokens.
     * @dev The collateral ratio is defined as:
     *      Collateral Ratio = (Collateral Value * DECIMALS) / Borrowed Amount
     * @param _collateralAmount The amount of collateral in ETH.
     * @param _borrowedAmount The amount of tokens borrowed.
     * @param _collateralPrice The price of the collateral asset in terms of the tradable token.
     * @return The collateral ratio as a percentage scaled by `DECIMALS`.
     */
    function getCollateralRatio(uint _collateralAmount, uint _borrowedAmount, uint _collateralPrice) internal pure returns (uint) {
        uint collateralValue = _collateralPrice * _collateralAmount / DECIMALS;
        uint collateralRatio = (collateralValue * DECIMALS)/ _borrowedAmount;
        return collateralRatio;
    }


    /**
     * @notice Calculates the borrower’s health factor based on their collateral and debt.
     * @dev The health factor is defined as:
     *      Health Factor = (Total Collateral Value * Liquidation Threshold) / Total Debt Value
     * @param _borrower The address of the borrower.
     * @param _newBorrowedAmount The new amount the borrower wishes to borrow.
     * @param _newCollateralAmount The additional collateral the borrower is depositing.
     * @param _collateralPrice The price of the collateral asset in terms of the tradable token.
     * @return The health factor as a percentage scaled by `DECIMALS`.
     */
    function getHealthFactor(address _borrower, uint _newBorrowedAmount, uint _newCollateralAmount, uint _collateralPrice) internal view returns (uint) {

        uint currentDebtValue = (debtToken.balanceOf(_borrower) / debtToken.getDebtIndex()) * DECIMALS;
        uint totalDebtValue = currentDebtValue + _newBorrowedAmount;
        uint totalCollateralValue =  (collateralBalances[_borrower] + _newCollateralAmount) * _collateralPrice / 1e18;
        uint healthFactor = (totalCollateralValue * liquidationThreshold) / totalDebtValue;
        return healthFactor;
    }

    /**
     * @notice Calculates the borrower’s health factor based on their existing collateral and debt.
     * @param _borrower The address of the borrower.
     * @param _collateralPrice The price of the collateral asset in terms of the tradable token.
     * @return The health factor as a percentage scaled by `DECIMALS`.
     */
    function getHealthFactor(address _borrower, uint _collateralPrice) internal view returns (uint) {

        uint totalDebtValue = (debtToken.balanceOf(_borrower) / debtToken.getDebtIndex()) * DECIMALS;
        require(totalDebtValue > 0, "No debt to calculate health factor");
        uint totalCollateralValue =  collateralBalances[_borrower]  * _collateralPrice / 1e18;        
        uint healthFactor = (totalCollateralValue * liquidationThreshold) / totalDebtValue;
        return healthFactor;
    }
}