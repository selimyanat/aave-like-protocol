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

* New Exchange Rate = Current Exchange Rate + (1 + Interest Accrued)
* Interest Accrued = Lending Rate × Time Elapsed / ONE_YEAR

### Why this works

* The lending rate tells us how much interest should be applied.
* The time elapsed ensures interest is applied proportionally over time.
* The exchange rate scales the interest automatically for all depositors, ensuring efficiency.

To determine how much a lender owes at any point in time, we use the exchange rate to scale 
their initial deposit amount:

* Total amount earned = Deposit amount × Current Exchange Rate / Exchange Rate at Lending

### Example: Exchnage Rate In Action

Let's take an example to illustrate that: 

* Starting Exchange Rate = 100%
* Suppose a fixed Lending APY = 10% to facilitate the explanation
* Alice deposits 1000 USDC, the exhange rate is equal to 100%
* After a year, the exchange rate index is equal now to 110%
* Alice's total balance is: 1000 USDC * (1.1/1) = 1100 USDC

* Later ...

* Bob deposits 1000 USDC, the exchange rate is equal to 110%
* After a year, the exchange rate index is equal now to 121%
* Bob's total balance is: 1000 USDC * (1.21/1.1) = 1100 USDC

Bob earns the same interest (10%) as Alice for his deposit duration, even though he deposited later.