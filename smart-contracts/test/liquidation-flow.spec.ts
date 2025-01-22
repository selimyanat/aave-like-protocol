
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import ContractRegistry from "./contracts/ContractRegistry";
import TestActorsRegistry from "./actors/TestActorsRegistry";
import {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO, ZERO_ADDRESS, DECIMAL_18, ONE_HUNDRED_THOUSAND, ONE_THOUSAND, TWO_THOUSAND, ONE_YEAR, ONE_DAY, ONE, FIVE_HUNDRED} from "./utils/Constants";
import BlockchainUtils from "./utils/BlockchainUtils";


describe("Liquidation flow", function() { 

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;
    
    let blokchainStateId: string;
    
    beforeEach(async function () {
            
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
            
        await actors.tradableTokenFoundation.airDrop(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        await actors.tradableTokenFoundation.airDrop(actors.gregTheLiquidator.getAddress(), FOUR_HUNDRED_THOUSAND.toString());

        //await actors.charlesTheProtocolAdmin.transferTradableTokensTo(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        //await actors.charlesTheProtocolAdmin.transferTradableTokensTo(actors.gregTheLiquidator.getAddress(), FOUR_HUNDRED_THOUSAND.toString());
        
        await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND.toString(), ONE_DAY)        
        await actors.bobTheBorrower.borrow(ONE_THOUSAND.toString(), ONE.toString());
                    
        blokchainStateId = await BlockchainUtils.saveState()
    })
    
    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Greg liquidates Bob's position", async function() {

        it("Rejects the liquidation if Greg triggers the liquidation for an address without a debt", async function () {
            
            await expect(actors.gregTheLiquidator.liquidate(actors.aliceTheLender.getAddress(), ONE_THOUSAND.toString()))
            .to.be
                .revertedWith("The borrower has no debt to liquidate")
        })

        it ("Rejects the liquidation if Bob's helath factor is safe", async function () {
            
            await expect(actors.gregTheLiquidator.liquidate(actors.bobTheBorrower.getAddress(), ONE_THOUSAND.toString()))
            .to.be
                .revertedWith("The borrower is not liquidatable, because the health factor is safe")
        })

        it ("Rejects the liquidation if the amount to repay Bob's debt is unsufficient to cover the interests", async function () {
            
            // decrease the collateral value to make the health factor unsafe
            await registry.oracleGateway.updateCollateralPriceInTradableToken(FIVE_HUNDRED)
            
            await expect(actors.gregTheLiquidator.liquidate(actors.bobTheBorrower.getAddress(), ONE_THOUSAND.toString()))
            .to.be
                .revertedWith("The amount of token sent to liquidate the debt is insufficient to cover the debt with the interests")
        })

        it ("Accepts the Liquidation if the amount of token covers the borrowed amount with interests", async function () {
            
            // decrease the collateral value to make the health factor unsafe
            await registry.oracleGateway.updateCollateralPriceInTradableToken(FIVE_HUNDRED)

            const expectedBobDebtToRepayWithInterest = ethers.parseUnits("1016.736420761406433787", DECIMAL_18).toString();
            const bobDebtTokenBalanceBeforeRepay = ethers.parseUnits("1008.222312328767122000", DECIMAL_18);

            const txResponse = await actors.gregTheLiquidator.liquidate(actors.bobTheBorrower.getAddress(), expectedBobDebtToRepayWithInterest)
            await expect(txResponse)
                    .to.emit(registry.pool, "Liquidation")
                            .withArgs(
                                actors.bobTheBorrower.getAddress(),  // borrower
                                actors.gregTheLiquidator.getAddress(),  // liquidator
                                expectedBobDebtToRepayWithInterest, // amount of token borrowed with interests
                                ethers.parseEther("0.1"), // collateral to liquidator
                                ethers.parseEther("0.9"), // collateral to borrower
                                ethers.parseUnits("200016.736420761406433787", DECIMAL_18), // total liquidity
                                ZERO, // total borrowed
                                ZERO) // utilization rate
                    .to.emit(registry.debtToken, "Transfer")
                            .withArgs(actors.bobTheBorrower.getAddress(), ZERO_ADDRESS, bobDebtTokenBalanceBeforeRepay)
                    .to.emit(registry.tradableToken, "Transfer")
                            .withArgs(actors.gregTheLiquidator.getAddress(), registry.poolAddress, expectedBobDebtToRepayWithInterest)
                    .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                            .withArgs(ethers.parseUnits("0.080000000000000000", DECIMAL_18))
                    .to.emit(registry.lendingRate, "LendingRateUpdated")
                            .withArgs(ethers.parseUnits("0.0640", DECIMAL_18))
                    .to.emit(registry.debtToken, "DebtIndexUpdated")
                            .withArgs(ethers.parseUnits("1.008665702657637012", DECIMAL_18))
                    .to.emit(registry.ibToken, "ExchangeRateUpdated")
                            .withArgs(ethers.parseUnits("1.000350715676487144", DECIMAL_18))

            // Check the balances in this statement do not merge with the previous one, it acts weirdly ignoring the previous statements
            await expect(txResponse).to.changeEtherBalance(actors.bobTheBorrower.getAddress(), ethers.parseEther("0.9"))
            await expect(txResponse).to.changeEtherBalance(actors.gregTheLiquidator.getAddress(), ethers.parseEther("0.1"))
        })

    })
})