
import { expect } from "chai";
import ContractRegistry from "../contracts/ContractRegistry";
import TestActorsRegistry from "../actors/TestActorsRegistry";
import {ZERO_ADDRESS, ONE_DAY} from "../utils/Constants";
import ScaledAmount, {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO, ONE_THOUSAND, ONE, FIVE_HUNDRED, TEN_THOUSAND} from "../utils/ScaledAmount";
import BlockchainUtils from "../utils/BlockchainUtils";
import TimeForwarder from "../utils/TimeForwarder";


describe("Liquidation flow", function() { 

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;
    
    let blokchainStateId: string;
    
    beforeEach(async function () {
            
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
            
        await actors.collateralTokenFaucet.transferTokens(actors.bobTheBorrower.getAddress(), TEN_THOUSAND);
        await actors.borrowedTokenFaucet.transferTokens(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND);
        await actors.borrowedTokenFaucet.transferTokens(actors.gregTheLiquidator.getAddress(), FOUR_HUNDRED_THOUSAND);
        
        await TimeForwarder.getInstance().forwardTime(ONE_DAY);
        await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND)
        await actors.bobTheBorrower.borrow(ONE_THOUSAND, ONE);
                    
        blokchainStateId = await BlockchainUtils.saveState()
    })
    
    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Greg liquidates Bob's position", async function() {

        it("Should reject the liquidation if Greg triggers the liquidation for an address without a debt", async function () {
            
            await expect(actors.gregTheLiquidator.liquidate(actors.aliceTheLender.getAddress(), ONE_THOUSAND))
            .to.be
                .revertedWith("The borrower has no debt to liquidate")
        })

        it ("Should reject the liquidation if Bob's helath factor is safe", async function () {
            
            await expect(actors.gregTheLiquidator.liquidate(actors.bobTheBorrower.getAddress(), ONE_THOUSAND))
            .to.be
                .revertedWith("The borrower is not liquidatable, because the health factor is safe")
        })

        it ("Should reject the liquidation if the amount to repay Bob's debt is unsufficient to cover the interests", async function () {
            
            // decrease the collateral value to make the health factor unsafe
            await registry.oracleGateway.updateCollateralPrice(FIVE_HUNDRED)
            
            await expect(actors.gregTheLiquidator.liquidate(actors.bobTheBorrower.getAddress(), ONE_THOUSAND))
            .to.be
                .revertedWith("The amount of token to repay the debt must be equal to borrowed amount including the interests")
        })

        it ("Should accept the liquidation if the amount of token covers the borrowed amount with interests", async function () {
            
            // decrease the collateral value to make the health factor unsafe
            await registry.oracleGateway.updateCollateralPrice(FIVE_HUNDRED)

            const expectedBobDebtToRepayWithInterest = ScaledAmount.of("1000.660273972602738000").value();
            const bobDebtTokenBalanceBeforeRepay = ScaledAmount.of("1000.219178082191780000").value();

            const txResponse = await actors.gregTheLiquidator.liquidate(actors.bobTheBorrower.getAddress(), expectedBobDebtToRepayWithInterest)
            await expect(txResponse)
                    .to.emit(registry.pool, "Liquidation")
                            .withArgs(
                                actors.bobTheBorrower.getAddress(),  // borrower
                                actors.gregTheLiquidator.getAddress(),  // liquidator
                                expectedBobDebtToRepayWithInterest, // amount of token borrowed with interests
                                ScaledAmount.of("0.1").value(), // collateral to liquidator
                                ScaledAmount.of("0.9").value(), // collateral to borrower
                                ScaledAmount.of("200000.660273972602738000").value(), // total liquidity
                                ZERO, // total borrowed
                                ZERO) // utilization rate
                    .to.emit(registry.debtToken, "Transfer")
                            .withArgs(actors.bobTheBorrower.getAddress(), ZERO_ADDRESS, bobDebtTokenBalanceBeforeRepay)                            
                    .to.emit(registry.borrowedToken, "Transfer")
                            .withArgs(actors.gregTheLiquidator.getAddress(), registry.poolAddress, expectedBobDebtToRepayWithInterest)
                    .to.emit(registry.collateralToken, "Transfer")
                            .withArgs(registry.poolAddress, actors.bobTheBorrower.getAddress(), ScaledAmount.of("0.9").value())
                    .to.emit(registry.collateralToken, "Transfer")
                            .withArgs(registry.poolAddress, actors.gregTheLiquidator.getAddress(), ScaledAmount.of("0.1").value())                            
                    .to.emit(registry.borrowingRate, "BorrowingRateUpdated")                    
                            .withArgs(ScaledAmount.of("0.080000000000000000").value())
                    .to.emit(registry.lendingRate, "LendingRateUpdated")                    
                            .withArgs(ScaledAmount.of("0.0640").value())
                    .to.emit(registry.debtToken, "DebtIndexUpdated")                    
                            .withArgs(ScaledAmount.of("1.000879452054794518").value())
                    .to.emit(registry.ibToken, "ExchangeRateUpdated")                    
                            .withArgs(ScaledAmount.of("1.000350715676487144").value())
        })

    })
})