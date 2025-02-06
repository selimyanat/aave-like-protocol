# 🪙 Tracking Borrower Debt Using Debt Token

## The Problem: Traditional Debt Tracking

Traditionnally, without tokenization, tracking a borrower debt would involve the following:

* Keeping a ledger that tracks each borrower's outstanding debt.
* Updating each borrower's balance every time interest accrues.

In the context of blockchain and smart contracts, these operations lead to significant
gas costs and inneficiencies, making debt tracking expensive.

## Aave’s Solution: Debt Tokens & Debt Index

Aave introduced a more efficient solution by issuing "debt tokens" to represent borrower's
debt:
* Instead of updating individual balances, Aave utilizes a debt index that scales the 
value of all outstanding debt tokens over time. 
* This index grows based on the borrowing rate (APR) and is updated whenever an operation 
impacts the utilization rate, such as a new deposit, repayment, or liquidation.

## How Does The Debt Index Work ?

### Debt Index Formula (Linear APR Growth)

<pre>
New Debt Index = Current Debt Index + Interest accrue
</pre>

<pre>
Interest accrues = Borrowing Rate X Time Elapsed X Debt index / ONE_YEAR
</pre>

### Why This Works ?

* The borrowing rate tells us how much interest should be applied.
* The time elapsed ensures interest is applied proportionally over time.
* The debt index scales the interest automatically for all borrowers, ensuring efficiency.

To determine how much a borrower owes at any point in time, we use the debt index to scale 
their initial borrowed amount:

<pre>
Total Debt Owed = Borrowed Amount × Current Debt Index / Debt Index at Borrowing
</pre>

### Example: Debt Index In Action

#### Initial Setup
* **Starting Debt Index**: 100%
* **Fixed Borrowing APR**: 10% (for simplicity)

#### Alice takes a loan

* **Alice borrows 1000 USDC**: 
    * Initial Debt Index: 100%
    * After 1 year, the Debt Index increases to 110%  (10% APR)
    * **Alice's total debt** is: <pre> 1000 USDC * (1.1/1) = 1100 USDC </pre>

#### Bob takes a loan 

*  **Bob borrows 1000 USDC**:
    * Initial Debt Index: 110%
    * After 1 year, the Debt Index increases to 121% (10% APR)
    * **Bob's total debt** is: <pre> 1000 USDC * (1.21/1.1) = 1100 USDC </pre>

> [!NOTE]  
> Bob pays the same interest (10%) as Alice for his loan duration, even though he borrowed 
> later.