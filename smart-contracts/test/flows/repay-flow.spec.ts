
import { expect } from "chai";
import ContractRegistry from "../contracts/ContractRegistry";
import TestActorsRegistry from "../actors/TestActorsRegistry";
import {ZERO_ADDRESS, ONE_YEAR, ONE_DAY} from "../utils/Constants";
import ScaledAmount, {TWO_HUNDRED_THOUSAND, ZERO, ONE_HUNDRED_THOUSAND, ONE_THOUSAND, TWO_THOUSAND, ONE, TEN_THOUSAND} from "../utils/ScaledAmount";
import BlockchainUtils from "../utils/BlockchainUtils";
import TimeForwarder from "../utils/TimeForwarder";


describe("Repay flow", function() { 

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        await actors.collateralTokenFaucet.transferTokens(actors.bobTheBorrower.getAddress(), TEN_THOUSAND);        
        await actors.borrowedTokenFaucet.transferTokens(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND);
        await TimeForwarder.getInstance().forwardTime(ONE_DAY);
        await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND)        
        await actors.bobTheBorrower.borrow(ONE_THOUSAND, ONE);
                
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
        await TimeForwarder.resetInstance();
    })

    describe("When Bob repays its loan", async function() {


        it ("Should reject the repay if the amount of token is less than the borrowed amount", async function(){

            await TimeForwarder.getInstance().forwardTime(ONE_YEAR);
            await expect(actors.bobTheBorrower.repayAll(ONE_HUNDRED_THOUSAND))
            .to.be
                .revertedWith("The amount of token to repay the debt must be equal to borrowed amount including the interests")
        })

        it ('Accepts the repay if the amount of token is equal to the borrowed amount with interests', async function() {

            await actors.borrowedTokenFaucet.transferTokens(actors.bobTheBorrower.getAddress(), TWO_THOUSAND.toString());

            await TimeForwarder.getInstance().forwardTime(ONE_YEAR);
            const estimateTotalDebt = await actors.bobTheBorrower.estimateTotalDebt();            
            expect(estimateTotalDebt).to.be.equal(ScaledAmount.of("1081.160273972602738000").value());
            const expectedNetDebtPaymentAfterFee = ScaledAmount.of("1064.972054794520546400").value();
            const bobDebtTokenBalanceBeforeRepay = await actors.bobTheBorrower.getDebtTokenBalance();
            
            
            const txResponse = await actors.bobTheBorrower.repayAll(estimateTotalDebt);
            await expect(txResponse)
                .to.emit(registry.pool, "Repayment")
                        .withArgs(
                            actors.bobTheBorrower.getAddress(),  // borrower
                            expectedNetDebtPaymentAfterFee,  // amount of token borrowed with interests
                            ONE, // collateral
                            ScaledAmount.of("200064.972054794520546400").value(), // total liquidity
                            ZERO, // total borrowed
                            ZERO) // utilization rate                  
                .to.emit(registry.debtToken, "Transfer")    
                    .withArgs(actors.bobTheBorrower.getAddress(), ZERO_ADDRESS, bobDebtTokenBalanceBeforeRepay)
                .to.emit(registry.borrowedToken, "Transfer")
                    .withArgs(actors.bobTheBorrower.getAddress(), registry.poolAddress, estimateTotalDebt)
                .to.emit(registry.collateralToken, "Transfer")
                    .withArgs(registry.poolAddress, actors.bobTheBorrower.getAddress(), ONE)
                .to.emit(registry.borrowingRate, "BorrowingRateUpdated")                
                    .withArgs(ScaledAmount.of("0.080000000000000000").value())
                .to.emit(registry.lendingRate, "LendingRateUpdated")                
                    .withArgs(ScaledAmount.of("0.0640").value())                                        
                .to.emit(registry.debtToken, "DebtIndexUpdated")                
                    .withArgs(ScaledAmount.of("1.161379452054794518").value())                    
                .to.emit(registry.ibToken, "ExchangeRateUpdated")                
                    .withArgs(ScaledAmount.of("1.064361937594295363").value())                
                .to.emit(registry.protocolReserve, "BorrowedTokenFeeCollected")
                    .withArgs(
                        registry.poolAddress, // pool
                        ScaledAmount.of("16.188219178082191600").value()) // fee
                .to.emit(registry.borrowedToken, "Transfer")
                    .withArgs(registry.poolAddress, 
                        registry.protocolReserveAddress, 
                        ScaledAmount.of("16.188219178082191600").value())
                                                            
                // Charles now wants to get the fee from the protocol reserve                
                await expect(actors.charlesTheProtocolAdmin.sendFundsFromReserve(actors.charlesTheProtocolAdmin.getAddress(), ScaledAmount.of("16.144109589041095800").value() ))
                    .to.emit(registry.protocolReserve, "BorrowedTokenWithdrawn")                    
                        .withArgs(actors.charlesTheProtocolAdmin.getAddress(), ScaledAmount.of("16.144109589041095800").value())
                    .to.emit(registry.borrowedToken, "Transfer")
                        .withArgs(registry.protocolReserveAddress, actors.charlesTheProtocolAdmin.getAddress(), ScaledAmount.of("16.144109589041095800").value()) 
                        
        })


    })


});