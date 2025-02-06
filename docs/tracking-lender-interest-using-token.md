# Tracking Lender Interest Using Interest-Bearing Tokens

## The Problem: Traditional Interest Tracking

Traditionnally, without tokenization, tracking a lender's interest would involve the following:

* Keeping a ledger that tracks each lender's deposit.
* Updating each lender's balance every time interest accrues.

In the context of blockchain and smart contracts, these operations lead to significant
gas costs and inneficiencies, making interest tracking expensive.

## Aave’s Solution: Interest-Bearing Tokens & Exchange Rate

Aave introduced a more efficient solution by issuing "interest-bearing tokens" to represent
lender's interest:

* Instead of updating individual balances, Aave utilizes an exchange rate that scales the 
value of all outstanding interest bearing tokens over time. 
* This exchange rate grows based on the borrowing rate (APY) and is updated whenever an operation 
impacts the utilization rate, such as a new deposit, repayment, or liquidation.


## How Does The Exchange Rate Work ?

### Exchange Rate Formula (Exponential APY Growth)

<pre>
New Exchange Rate = Current Exchange Rate X (1 + Interest Accrued)
</pre>

<pre>
Interest Accrued = Lending Rate × Time Elapsed / ONE_YEAR
</pre>

### Why this works

* The lending rate tells us how much interest should be applied.
* The time elapsed ensures interest is applied proportionally over time.
* The exchange rate scales the interest automatically for all depositors, ensuring efficiency.

To determine how much a lender owes at any point in time, we use the exchange rate to scale 
their initial deposit amount:

<pre>
Total amount earned = Deposit amount × Current Exchange Rate / Exchange Rate at Lending
</pre>

### Example: Exchnage Rate In Action

#### Initial Setup
* **Starting Exchange Rate**: 100%
* **Fixed Lending APY**: 10% (for simplicity)

#### Alice makes a deposit
* **Alice deposits 1000 USDC**
    * Initial Exchange Rate: 100%
    * After a year, the Exchange rate increases to 110.5% (10% APY)
    * **Alice's total balance** is: <pre> 1000 USDC * (1.105/1) = 1105 USDC </pre> 

> [!NOTE]
> Alice earns **compounded** interest, bringing her total to 1,105 USDC.


#### Bob makes a deposit

* **Bob deposits 1000 USDC**
    * Initial Exchange Rate: 110.5%
    * After a year, the Exchange rate increases to 122.1% (10% APY)
    * **Bob's total balance** is: <pre> 1000 USDC * (1.221/1.105) = 1100 USDC </pre> 

> [!NOTE]  
> Bob earns the same interest (10%) as Alice for his deposit duration, even though he 
> deposited later.