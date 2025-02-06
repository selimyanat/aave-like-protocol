# 📈  Mitigating Collateral Price Fluctuations: Understanding Liquidation

## The problem: Collateral price fluctuations

Imagine Alice has `5 ETH` (worth 10000$ at 2000$ per ETH). She wants to borrow `6000$ in USDC`.  
She deposits her `5 ETH` into a DeFi lending protocol as collateral. Now, what happens if the price 
of ETH drops significantly ? 

While `TradFi` also faces price fluctuations, the crypto market is extremly volatile making the occurence
of such events more frequent and severe. Without risk management, lenders could face major losses if
borrowers default when their collateral value drops too low. 

## The solution: Liquidation

To protect against collateral price fluctuations, DeFi protocols uses two layers of security:

* **Over-Collaterization**: Borrowers must deposit more collateral than they borrow to create a 
safety buffer. However, extreme market events (e.g., Black Thursday 2020) can cause collateral 
prices to crash rapidly, making over-collateralization insufficient.

* **Liquidation Mechanism**: If the collateral value drops below a certain threshold, the protocol 
automatically puts the borrower under liquidation.

## How does it work ?

A borrower position is marked as liquidable when the ratio of the deposited collateral 
against the borrowed assets, aka health factor, becomes under the safety threshold. 
Therefore, liquidators which can be individuals or bots who monitor the protocol for 
under-collateralized positions. When a position is found under-collateralize they trigger 
the liquidation function in the protocol’s smart contract by repaying a part or all 
the borrower's debt.

In return the liquidator receives a portion of the borrower’s collateral as an incentive.
The remaining collateral is returned to the borrower. 

> [!NOTE]  
> Some DeFi protocols charge an additional liquidation fee that goes to the protocol.

## Example: Liquidation in Action

### ⚙️ Initial Setup
* **Alice deposits 5 ETH** (worth 10000$) as collateral.
* **She borrows 6000 USDC**.
* The protocol requires **a minimum health factor of 1.2** (meaning Alice’s collateral must 
be at least 120% of her borrowed amount).

### 📈 Market fluctuation
* **ETH’s price drops** from 2000$ to 1300$.
* **Alice’s collateral value falls** to 6500$, but she still owes 6000 USDC.
* **New health factor** is: <pre> 6500 / 6000 = 1.08 < 1.2 </pre>
* **Alice’s loan is now under-collateralized** and eligible for liquidation.

### 🏛️ Liquidation process
* **A liquidator repays the full loan 6000 USDC** of Alice’s loan.
* In return, the liquidator receives **1 ETH** of Alice's collateral (20%) as an incentive.
* The **remaining collateral 4 ETH** is returned to Alice.

> [!NOTE]  
> In most DeFi protocols, liquidators can repay the full loan or a portion **including the
> interests**. In this example, we omitted the interests for simplification purposes.
