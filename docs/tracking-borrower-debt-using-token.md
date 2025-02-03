# Tracking borrower debt using debt token

Traditionnally, without tokenization, a borrower debt would involve the following:

* Keeping a ledger that tracks each borrower's outstanding debt.
* When interest accrues, the protocol updates each borrower's debt balance.

In the context of blockchain and smart contracts, these operations leads to significant
gas consumption and cost for users.

Aave introduced a more efficient solution by representing debt as debt tokens. Instead of 
updating individual balances, Aave utilizes a debt index that scales the value of all 
outstanding debt tokens over time. This index grows based on the borrowing rate (APR) and 
is updated whenever an operation impacts the utilization rate, such as a new deposit, 
repayment, or liquidation.

# How the debt index works ?

The debt index is calculated using the following formula:

New Debt Index = Current Debt Index + (Borrowing Rate X Time Elapsed X Current Debt Index) / One Year

To determine how much a borrower owes at any point in time, we use the debt index to scale 
their initial borrowed amount:

Total Debt Owed = Borrowed Amount × Current Debt Index / Debt Index at Borrowing

Let's take an example to illustrate that: 

* Starting Debt Index = 1%
* Suppose a fixed Borrowing APR = 10% to facilitate the explanation
* Alice borrows 1000 USDC, the debt index is equal to 1%
* After a year, the debt index at repayment is equal now to 1.1%
* Alice's total debt is: 1000 USDC * (1.1/1) = 1100 USDC
* Later ...
* Bob borrows 1000 USDC, the debt index is equal to 1.1%
* After a year, the debt index at repayment is equal now to 1.21%
* Alice's total debt is: 1000 USDC * (1.21/1.1) = 1100 USDC

# In summary

Beyond the efficiency that bring debt tokens, the benefits of tokenization in general (
fractional ownership, increased accessibility, etc) also apply to debt tokens. This innovation
has the potential to transform how we think about and manage debt within the DeFi ecosystem.