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

## How Does It Work ?

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

###  The Liquidation Formula

<pre>
Collateral seized = Debt repaid / Collateral price x (1 + Liquidation bonus)
</pre>

<pre>
Remaining collateral = Total collateral - Collateral seized
</pre>

### Why This Works ?

* The debt repaid is the amount the liquidator is repaying (including interests).
* The liquidation bonus gives the liqudidator more collateral than the amount to repaid.
* The collateral price determines how much collateral is equivalent to the debt being repaid.

This ensures that liquidators make a profit, which encourages them to participate in liquidations. 

> [!WARNING]
> Liquidation must happens sooner so that there will still be enough collateral to fairly 
> compensante the liquidator. Otherwise the protocol would cap the colalteral (Collateral to seize 
> <= Total collateral) to prevent taking more than what the borrower owns.
> More importantly, some protocols run their own liquidation bots as a backup
> when external liquidators don't act. This ensures that bad debt does not remain
> unliquidated for too long.

<pre>
Liquidator's profit = Collateral seized x liquidation bonus
</pre>

## Example: Liquidation in Action

### ⚙️ Initial Setup
* The protocol requires **a minimum health factor of 1**
* **Liquidation bonus**: 10%
* **Liquidation threshold**: 80%
* **Alice borrows 1000 USDC**.
* **Alice deposits 2 ETH** (worth 10000$) as collateral.
* **Alice's health factor is safe**: <pre> (4000 / 1000) x (0.8) = 3.2 > 1 </pre> 

### 📈 Market Fluctuation
* **ETH’s price drops** from 2000$ to 600$.
* **Alice’s collateral value falls** to 1200$, but she still owes 1000 USDC.
* **New health factor** is: <pre> (1200 / 1000) x 0.8 = 0.96 < 1 </pre>
* **Alice’s loan is now under-collateralized** and eligible for liquidation.

### 🏛️ Liquidation Process
* **A liquidator repays the full loan 1000 USDC** of Alice’s loan.
* In return, the liquidator receives: <pre>1000/600 x (1 + 0.1) = 1.83 ETH = 1098$</pre>
* The liquidator's profit is: <pre> 1.83 x 0.1 = 0.183 ETH = +109$ </pre>
* Alice was **fully liquidated** and here **remaining collateral** is: 2 - 1.83 = 0.17 ETH. 

> [!NOTE]  
> In most DeFi protocols, liquidators can repay the full loan or a portion **including the
> interests**. In this example, we omitted the interests for simplification purposes.