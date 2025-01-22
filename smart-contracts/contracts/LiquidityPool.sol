// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./InterestBearingTestToken.sol";
import "hardhat/console.sol";


contract LiquidityPool {

    // 80% liquidation threshold
    uint public constant LIQUIDATION_THRESHOLD = 0.8 * 1e18;

    // The base borrowing rate is the minimum interest rate that the borrower has to pay.
    uint public BASE_BORROWING_RATE = 0.08 * 1e18;

    // The lending rate represents the annualized return that lenders earn on their deposited assets. It provides lenders 
    // with an understanding of their expected earnings over time.
    //The lending rate influences the rate at which the exchange rate appreciates. A higher lending rate leads to a faster 
    // increase in the exchange rate, indicating that IBTs are accruing value more rapidly.
    uint public LENDING_RATE = 0.05 * 1e18;

    // A factor that scales the increase in the borrow rate as utilization rises.
    uint public MULTIPLIER = 0.1 * 1e18;

    // The risk of locking funds at a fixed rate in a dynamic system. Potential future losses for 
    // the protocol if the variable rate increases significantly.
    uint public RISK_PREMIUM = 0.02 * 1e18;

    // A percentage (e.g., 10%) of the interest paid by borrowers is kept by the protocol as a reserve to 
    // cover potential losses or provide protocol revenue.
    uint public RESERVE_FACTOR = 0.1 * 1e18;

    // Calculating the total interest earned or paid using interest-bearing tokens involves understanding their exchange 
    // rates relative to the underlying assets
    uint public EXCHANGE_RATE = 0.08 * 1e18;

    mapping (address => uint) borrowAmounts;

    mapping (address => uint) depositAmounts;

    mapping(address => uint256) public collateralBalances;

    IERC20 public token;

    InterestBearingTestToken public ibToken;

    address public tokenAddress;

    address public ibTokenAddress;

    // The exchange rate defines the value of one IBT in terms of the underlying asset. It reflects the accrued interest 
    // and the growth of the underlying asset pool. As the exchange rate appreciates, each IBT becomes redeemable for a 
    // larger amount of the underlying asset.
    uint public currentExchangeRate;

    uint public totalLiquidity;

    uint public totalBorrows;

    uint public collateralFactor;

    uint public collateralPrice;

    event LiquidityAdded(address indexed depositor, address token, uint amount);

    event Borrowed(address indexed borrower, address token, uint amount, uint collateralRatio, uint healthFactor);

    event CollateralPriceUpdated(uint256 newPrice);

    event Withdrawn(address indexed withdrawer, address token, uint amount, uint remainingWithdrawerBalance, uint totalLiquidity);

    event Repayed(address indexed borrower, address token, uint amount, uint remainingBorrowerCollateralBalance, uint remainingBorrowerBalance, uint totalBorrows);

    event Liquidation(address indexed borrower, address indexed liquidator, uint amount, uint remainingBorrowerCollateralBalance, uint remainingBorrowerBalance, uint totalBorrows, uint totalLiquidity);

    event ExchangeRateUpdated(uint newExchangeRate);

    constructor(address _token, address _ibToken ,uint _collateralFactor) {
        // TOOD add the liquidation threshold
        tokenAddress = _token;
        ibTokenAddress = _ibToken; 
        token = IERC20(_token);
        ibToken = InterestBearingTestToken(_ibToken);
        collateralFactor = _collateralFactor;
        // Here we are assuming that the collateral value is equal to the borrowed amount like 1 ETH for 2000 Test token (scaled to 18 decimals)
        collateralPrice = 2000 * 1e18;
        currentExchangeRate =  EXCHANGE_RATE;
    }

    function addLiquidity(uint amount) public {

        require(amount > 0, "Amount should be greater than 0");

        totalLiquidity += amount;        
        depositAmounts[msg.sender] += amount;
        token.transferFrom(msg.sender, address(this), amount);
        // TODO we need to mint the ibToken to the user
        // convert the token to ibToken: uint ibAmount = (amount * EXCHANGE_RATE) / 1e18; 
        // exchange rate is dynamic and dependent on the utilization rate
        updateExchangeRate();
        uint ibTokenAmount = (amount * currentExchangeRate) / 1e18;
        ibToken.mint(msg.sender, ibTokenAmount);
        emit LiquidityAdded(msg.sender, tokenAddress, amount);
    }

    function borrows(uint borrowedAmount) public payable {
        
        require(msg.value > 0, "Collateral must be greater than 0");
        console.log('msg value when calling borrow amount: %s', msg.value);
        require(borrowedAmount > 0, "Borrowed Amount should be greater than 0");
        require(totalLiquidity >= borrowedAmount, "Insufficient liquidity in the pool");        

        uint collateralAmount = msg.value;
        // TODO this is called load to value: the ratio of the borrowed amount to the value of the collateral.
        uint collateralRatio = getCollateralRatio(collateralAmount, borrowedAmount);
        console.log("collateral ratio: %s", collateralRatio);
        require(collateralRatio >= collateralFactor, "Collateral ratio should be higher or equal to the collateral factor");
        uint healthFactor = getHealthFactor(borrowedAmount, collateralAmount);
        require(healthFactor >= 1e18, "Health factor should be greater than 1");

        // TODO we need to track the borrower debt in the ibToken. Perhaps it should not be here but in the repay and 
        // liquidate functions ?
        // convert the token to ibToken: uint ibAmount = (borrowedAmount * EXCHANGE_RATE) / 1e18;
        // why is that ???
        borrowAmounts[msg.sender] += borrowedAmount ;        
        collateralBalances[msg.sender] += collateralAmount;
        console.log("collateral balance: %s", collateralBalances[msg.sender]);
        totalBorrows += borrowedAmount;
        totalLiquidity -= borrowedAmount;
        // TODO update the exchange rate
        //updateExchangeRate();
        token.transfer(msg.sender, borrowedAmount);        
        emit Borrowed(msg.sender, tokenAddress, borrowedAmount, collateralRatio, healthFactor);
    }

    function withdraw(uint amount) public {

        // Lenders earn interest through the appreciation of the exchange rate of their IBTs, which 
        // can be calculated by multiplying their IBT balance by the current exchange rate.
        // Total Assets=IBT Balance×Current Exchange Rate and burn the IBT

        // TODO we need to burn the ibToken before return the token to the user
        require(amount > 0, "Amount should be greater than 0");
        require(totalLiquidity >= amount, "Insufficient liquidity in the pool");
        require(depositAmounts[msg.sender] >= amount, "Insufficient balance");

        depositAmounts[msg.sender] -= amount;
        totalLiquidity -= amount;
        // TODO update the exchange rate
        //updateExchangeRate();
        token.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, tokenAddress, amount, depositAmounts[msg.sender], totalLiquidity);
    }

    function repay(uint amount) public {

        // The protocol records the borrower's debt in terms of IBTs. As the exchange rate appreciates, 
        // the debt's value in the underlying asset increases, representing the accrued interest.
        // Total Debt=Debt in IBTs×Current Exchange Rate

        require(amount > 0, "Amount should be greater than 0");
        // TODO here we need to calculate the amount by considering the borrow rate. The formulat is
        // Total Debt= Initial Debt×(1+Borrow Rate)
        require(borrowAmounts[msg.sender] == amount, "Insufficient balance, only full payment is allowed");
        
        borrowAmounts[msg.sender] -= amount;
        totalBorrows -= amount;
        totalLiquidity += amount;
        // think we need to divide it by the decimal or multiply it ?
        uint collateralToReturn = collateralBalances[msg.sender];
        collateralBalances[msg.sender] = 0;         
        console.log("collateral to return: %s", collateralToReturn);
        token.transferFrom(msg.sender, address(this), amount);   
        // TODO update the exchange rate
        //updateExchangeRate();
        payable(msg.sender).transfer(collateralToReturn);
        emit Repayed(msg.sender, tokenAddress, amount, 0, 0, totalBorrows);
    }

    function liquidate(address borrower, uint amount) public payable {

        // TODO review whole implementation
        // The very frist thing is to check the health factor of the borrower
        require(amount > 0, "Amount should be greater than 0");
        require(collateralBalances[borrower] > 0, "Borrower has no debt to liquidate");
        // TODO here we need to calculate the amount by considering the borrow rate. The formulat is
        // Total Debt= Initial Debt×(1+Borrow Rate)
        require(borrowAmounts[borrower] == amount, "Insufficient repayment amount, only full repayment is allowed");
        uint healthFactor = getCurrentHealthFactor(borrower);
        console.log("health factor before liquidation: %s", healthFactor);
        require(healthFactor < 1e18, "Borrower is not liquidatable");

        // The liquidator pays the debt in ERC-token
        console.log("amount to liquidate the debt: %s", amount);
        console.log("borrower balance before liquidation: %s", borrowAmounts[borrower]); 
        console.log("totalBorrows: %s", totalBorrows);
        console.log("totalLiquidity: %s", totalLiquidity);
        totalBorrows -= amount;
        totalLiquidity += amount;   
        uint collateralToReturn = collateralBalances[borrower]; 
        collateralBalances[borrower] = 0; 
        borrowAmounts[borrower] = 0;
        // send the collateral back to the liquidator
        console.log("collateral to return: %s", collateralToReturn);
        payable(msg.sender).transfer(collateralToReturn);
        // incentivize the liquidator for the liquidation, in addition to the collateral, the liquidator should get an incentive
        token.transferFrom(msg.sender, address(this), amount);
        // what about the collateral ? the liquidator should get the collateral in exchange for the debt
        //event Liquidatation(address indexed borrower, address indexed liquidator, uint amount, uint remainingBorrowerCollateralBalance, uint remainingBorrowerBalance, uint totalBorrows, uint totalLiquidity);
        console.log("borrower collateralBalances : %s", collateralBalances[borrower]);
        console.log("borrower borrowAmounts: %s", borrowAmounts[borrower]);
        console.log("amount: %s", amount);
        emit Liquidation(borrower, msg.sender, amount, collateralBalances[borrower] , borrowAmounts[borrower], totalBorrows, totalLiquidity);
    }

    function getCollateralRatio(uint collateralAmount, uint borrowedAmount) internal view returns (uint) {
        // In real life scenario, we need to get the price from the oracle
        uint collateralValue = (collateralAmount * collateralPrice) / 1e18;
        console.log("collateral value: %s", collateralValue);
        uint256 collateralRatio = (collateralValue * 1e18) / borrowedAmount;
        return collateralRatio;
    }

    function getHealthFactor(uint newBorrowedAmount, uint newCollateralAmount) internal view returns (uint) {

        uint totalDebtValue = borrowAmounts[msg.sender] + newBorrowedAmount;
        require(totalDebtValue > 0, "No debt to calculate health factor");

        uint totalCollateralValue =  (collateralBalances[msg.sender] + newCollateralAmount) * collateralPrice / 1e18;

        uint healthFactor = (totalCollateralValue * LIQUIDATION_THRESHOLD) / totalDebtValue;
        console.log("health factor: %s", healthFactor);
        return healthFactor;
    }

    function getCurrentHealthFactor(address borrower) internal view returns (uint) {

       require(borrowAmounts[borrower] > 0, "No debt to calculate health factor");
       uint totalCollateralValue =  collateralBalances[borrower] * collateralPrice / 1e18;
       uint healthFactor = (totalCollateralValue * LIQUIDATION_THRESHOLD) / borrowAmounts[borrower];
       console.log("health factor: %s", healthFactor);
       return healthFactor;
    }

    function updateCollateralPrice(uint256 newPrice) public {
        // In real life scenario, we need to get the price from the oracle
        require(newPrice > 0, "Price must be greater than 0");
        collateralPrice = newPrice;
        emit CollateralPriceUpdated(newPrice);
    }

    function getTotalLiquidity() public view returns (uint) {
        return totalLiquidity;
    }

    function getTotalBorrows() public view returns (uint) {
        return totalBorrows;
    }

    function getDepositAmount(address user) public view returns (uint) {
        return depositAmounts[user];
    }

    function getBorrowedAmount(address user) public view returns (uint) {
        return borrowAmounts[user];
    }

    function getUtilizationRate() public view returns (uint) {

        if (totalLiquidity == 0) {
            return 0;
        }
        return (totalBorrows * 1e18)/ (totalLiquidity + totalBorrows);
    }

    function getBorrowingRate() public view returns (uint) {
        // borrow rate=Base Rate+(Utilization rate × Multiplier)
        return BASE_BORROWING_RATE + (getUtilizationRate() * MULTIPLIER) / 1e18;
    }

    function getLendingRate() public view returns (uint) {
        // Lending Rate (APR)=Borrow Rate×(1−Reserve Factor)
        // If lending rates are compounded continuously: the formula for the effective borrowing rate is
        // Effective Lending Rate (APY)= (e lending APR) −1
        return getBorrowingRate() * (1e18 - RESERVE_FACTOR) / 1e18;
    }

    function updateExchangeRate() public {
        // While the borrow rate is dynamically adjusted based on the utilization rate, the exchange rate 
        // between IBTs and the underlying asset is updated during user interactions or at predetermined 
        // intervals. This approach ensures that interest accrual is accurately represented without 
        // incurring excessive computational costs.
        
        // when a user interacts with the pool, the exchange rate is updated to reflect the current
        // New Exchange Rate=Initial Exchange Rate×(1+Lending Rate)
        // This is APR without continuous compounding. For continuous compounding APY , we need to use
        // Effective Borrowing Rate (APY)= (e APR) −1
        currentExchangeRate = currentExchangeRate * (1e18 + getLendingRate()) / 1e18;
        emit ExchangeRateUpdated(currentExchangeRate);
    }
}
