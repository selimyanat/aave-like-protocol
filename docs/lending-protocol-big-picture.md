







Sure! Here is the equivalent diagram using Mermaid syntax:

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#ffcc00', 'edgeLabelBackground':'#ffffff', 'tertiaryColor': '#ffffff'}}}%%
graph TD
    title[Lending protocol use-case diagram]

    subgraph "Lending Protocol"
        direction TB
        subgraph " "
            UC1[Deposit funds]
            UC2[Withdraw funds]
            UC3[Earn interests]
        end
        subgraph " "
            UC4[Take loan]
            UC5[Deposit collateral]
            UC6[Repay loan]
            UC7[Pay interests]
            UC8[Pay protocol fee]
            UC9[Receive collateral back]
            UC10[Receive part of the collateral after liquidation]
        end
        subgraph " "
            UC11[Monitor loans]
            UC12[Liquidate under-collaterized loans]
            UC13[Receive part of the collateral]
        end
        subgraph " "
            UC14[Provide realtime price for collateral]
        end
    end

    lender[Lender] --> UC1
    lender --> UC2
    UC2 --> UC3

    borrower[Borrower] --> UC4
    borrower --> UC6
    borrower --> UC10
    UC4 --> UC5
    UC6 --> UC7
    UC6 --> UC8
    UC6 --> UC9

    liquidator[Liquidator] --> UC11
    liquidator --> UC12
    UC12 --> UC13

    oracle[Oracle] --> UC14
```


```
This Mermaid diagram should render correctly on GitHub and visually represent the same structure as your original PlantUML diagram.
```



# OLD

![Lending Protocol Use Case Diagram](lending-protocols-use-case.png)