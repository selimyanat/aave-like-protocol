
import { expect } from "chai";
import ContractRegistry from "../contracts/ContractRegistry";
import TestActorsRegistry from "../actors/TestActorsRegistry";
import {ZERO_ADDRESS, ONE_YEAR, ONE_DAY} from "../utils/Constants";
import ScaledAmount, {TWO_HUNDRED_THOUSAND, ZERO, ONE_HUNDRED_THOUSAND, ONE_THOUSAND, TWO_THOUSAND, ONE} from "../utils/ScaledAmount";
import BlockchainUtils from "../utils/BlockchainUtils";


describe("Repay flow", function() { 

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        await actors.borrowedTokenFaucet.transferTokens(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND);
        await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND, ONE_DAY)        
        await actors.bobTheBorrower.borrow(ONE_THOUSAND, ONE);
                
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Bob repays its loan", async function() {


        it ("Should reject the repay if the amount of token is less than the borrowed amount", async function(){

            await expect(actors.bobTheBorrower.repayAll(ONE_HUNDRED_THOUSAND, ONE_YEAR))
            .to.be
                .revertedWith("The amount of token to repay the debt must be equal to borrowed amount including the interests")
        })

        it ('Accepts the repay if the amount of token is equal to the borrowed amount with interests', async function() {

            await actors.borrowedTokenFaucet.transferTokens(actors.bobTheBorrower.getAddress(), TWO_THOUSAND.toString());

            const expectedBobDebtToRepayWithInterest = ScaledAmount.of("1080.939726027397259000").value();
            const expectedNetDebtPaymentAfterFee = ScaledAmount.of("1064.795616438356163200").value();
            const bobDebtTokenBalanceBeforeRepay = await actors.bobTheBorrower.getDebtTokenBalance();

            const txResponse = await actors.bobTheBorrower.repayAll(expectedBobDebtToRepayWithInterest, ONE_YEAR);
            await expect(txResponse)
                .to.emit(registry.pool, "Repayment")
                        .withArgs(
                            actors.bobTheBorrower.getAddress(),  // borrower
                            expectedNetDebtPaymentAfterFee,  // amount of token borrowed with interests
                            ONE, // collateral
                            ScaledAmount.of("200064.795616438356163200").value(), // total liquidity
                            ZERO, // total borrowed
                            ZERO) // utilization rate                  
                .to.emit(registry.debtToken, "Transfer")    
                    .withArgs(actors.bobTheBorrower.getAddress(), ZERO_ADDRESS, bobDebtTokenBalanceBeforeRepay)
                .to.emit(registry.borrowedToken, "Transfer")
                    .withArgs(actors.bobTheBorrower.getAddress(), registry.poolAddress, expectedBobDebtToRepayWithInterest)
                .to.emit(registry.borrowingRate, "BorrowingRateUpdated")                
                    .withArgs(ScaledAmount.of("0.080000000000000000").value())
                .to.emit(registry.lendingRate, "LendingRateUpdated")                
                    .withArgs(ScaledAmount.of("0.0640").value())                                        
                .to.emit(registry.debtToken, "DebtIndexUpdated")                
                    .withArgs(ScaledAmount.of("1.160939726027397259").value())                    
                .to.emit(registry.ibToken, "ExchangeRateUpdated")                
                    .withArgs(ScaledAmount.of("1.064186564383561643").value())                
                .to.emit(registry.protocolReserve, "BorrowedTokenFeeCollected")
                    .withArgs(
                        registry.poolAddress, // pool
                        ScaledAmount.of("16.144109589041095800").value()) // fee
                .to.emit(registry.borrowedToken, "Transfer")
                    .withArgs(registry.poolAddress, 
                        registry.protocolReserveAddress, 
                        ScaledAmount.of("16.144109589041095800").value())
                                                            
                // Check the balances in this statement do not merge with the previous one, it acts weirdly ignoring the previous statements
                await expect(txResponse).to.changeEtherBalance(actors.bobTheBorrower.getAddress(), ONE)

                // Charles now wants to get the fee from the protocol reserve                
                await expect(actors.charlesTheProtocolAdmin.sendFundsFromReserve(actors.charlesTheProtocolAdmin.getAddress(), ScaledAmount.of("16.144109589041095800").value() ))
                    .to.emit(registry.protocolReserve, "BorrowedTokenWithdrawn")                    
                        .withArgs(actors.charlesTheProtocolAdmin.getAddress(), ScaledAmount.of("16.144109589041095800").value())
                    .to.emit(registry.borrowedToken, "Transfer")
                        .withArgs(registry.protocolReserveAddress, actors.charlesTheProtocolAdmin.getAddress(), ScaledAmount.of("16.144109589041095800").value()) 
                        
        })


    })


});