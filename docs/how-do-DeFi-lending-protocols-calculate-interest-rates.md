# 🧮  How Do DeFi Lending Protocols Calculate Interest Rates?

In `TradFi`, interest rates are determined by central banks and governments, taking into 
account factors such as inflation, economic growth, and credit risk. Conversely, 
interest rates in `DeFi` lending protocols such as `Aave` tend to be `more` dynamic and are 
based on market conditions, aka `supply and demand`:

* When the demand for borrowing is high, interest rates tend to rise, incentivizing more 
people to lend their assets. 
* Conversely, when the supply is high, interest rates tend to fall, encouraging more 
people to borrow assets. 

The ratio between borrowed assets and the total assets supplied is called the 
`utilization rate`. This rate is automatically calculated by smart contracts and used 
to adjust the interest rates in real time. Lending protocols communicate interest
rates to their lenders and borrowers by three two metrics: **Annual Percentage Rate (APR)**,
**Annual Percentage Yield (APY)**. Let's zoom in a little bit into
these metrics.

> [!NOTE]  
> Aave offers interest rates that can be stable as well.


## Annual Percentage Rate (APR)
APR is typially used for borrowers and represents the cost of borrowing without 
compounding. In other words, it assumes the interest is calculated just once a year. 
Here's an example to illustrate that:
* Imagine you borrow 100$ with an APR of 10%.
* After 1 year, you owe 110$.

> [!WARNING]  
> When a protocol advertises an APR of 10%, it is reflecting the current rate at that specific
> moment unless it was specified as a fixed and stable rate.


## Annual Percentage Yield (APY) 
APY is typically used for lenders,and measures the interest rate with compounding included,
leading to higher effective returns. In other words, the interest rate is added periodically 
(daily, year, block, etc.) to the original amount and future interest is calculated on this 
larger amount. Here's an example to illustrate that:

* Imagine you invest $100 with an APY of 10% compounded semi-annually.
* After 6 months, you earn 5% which is 5$ which turns your initial investment to 105$.
* In the next 6 months, you earn another 5% but the interest rate is calculated on 105$ 
turning the initial investiment into 110.25$. The extra 0.25$ comes from compounding.

> [!WARNING]  
> When a protocol advertises an APY of 10%, it is reflecting the current rate at that specific
> moment unless it was specified as a fixed and stable rate.