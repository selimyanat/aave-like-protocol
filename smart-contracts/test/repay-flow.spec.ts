
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import ContractRegistry from "./contracts/ContractRegistry";
import TestActorsRegistry from "./actors/TestActorsRegistry";
import {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO, ZERO_ADDRESS, DECIMAL_18, ONE_HUNDRED_THOUSAND, ONE_THOUSAND, TWO_THOUSAND, ONE_YEAR, ONE_DAY, ONE} from "./utils/Constants";
import BlockchainUtils from "./utils/BlockchainUtils";
import exp from "constants";


describe("Repay flow", function() { 

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        //await actors.charlesTheProtocolAdmin.transferTradableTokensTo(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        await actors.tradableTokenFoundation.airDrop(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND.toString(), ONE_DAY)        
        await actors.bobTheBorrower.borrow(ONE_THOUSAND.toString(), ONE.toString());
                
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Bob repays its loan", async function() {


        it ("Rejects the repay if the amount of token is less than the borrowed amount", async function(){

            await expect(actors.bobTheBorrower.repayAll(ONE_HUNDRED_THOUSAND.toString(), ONE_YEAR))
            .to.be
                .revertedWith("The amount of token allowed to repay the debt is insufficient to cover the debt with the interests")
        })

        it ('Accepts the repay if the amount of token is equal to the borrowed amount with interests', async function() {

            await actors.tradableTokenFoundation.airDrop(actors.bobTheBorrower.getAddress(), TWO_THOUSAND.toString());

            const expectedBobDebtToRepayWithInterest = ethers.parseUnits("1098.341465679310105694", DECIMAL_18).toString();
            const expectedNetDebtPaymentAfterFee = ethers.parseUnits("1080.317635009201508956", DECIMAL_18).toString();
            const bobDebtTokenBalanceBeforeRepay = await actors.bobTheBorrower.getDebtTokenBalance();

            const txResponse = await actors.bobTheBorrower.repayAll(expectedBobDebtToRepayWithInterest, ONE_YEAR);
            await expect(txResponse)
                .to.emit(registry.pool, "Repayment")
                        .withArgs(
                            actors.bobTheBorrower.getAddress(),  // borrower
                            expectedNetDebtPaymentAfterFee,  // amount of token borrowed with interests
                            ONE, // collateral
                            ethers.parseUnits("200080.317635009201508956", DECIMAL_18), // total liquidity
                            ZERO, // total borrowed
                            ZERO) // utilization rate
                        
                .to.emit(registry.debtToken, "Transfer")    
                    .withArgs(actors.bobTheBorrower.getAddress(), ZERO_ADDRESS, bobDebtTokenBalanceBeforeRepay)
                .to.emit(registry.tradableToken, "Transfer")
                    .withArgs(actors.bobTheBorrower.getAddress(), registry.poolAddress, expectedBobDebtToRepayWithInterest)
                .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                    .withArgs(ethers.parseUnits("0.080000000000000000", DECIMAL_18))
                .to.emit(registry.lendingRate, "LendingRateUpdated")
                    .withArgs(ethers.parseUnits("0.0640", DECIMAL_18))
                .to.emit(registry.debtToken, "DebtIndexUpdated")
                    .withArgs(ethers.parseUnits("1.176534945148931505", DECIMAL_18))
                .to.emit(registry.ibToken, "ExchangeRateUpdated")                
                .to.emit(registry.protocolReserve, "TradableTokenFeeCollected")
                    .withArgs(
                        registry.poolAddress, // pool
                        ethers.parseUnits("18.023830670108596738", DECIMAL_18)) // fee
                .to.emit(registry.tradableToken, "Transfer")
                    .withArgs(registry.poolAddress, 
                        registry.protocolReserveAddress, 
                        ethers.parseUnits("18.023830670108596738", DECIMAL_18))
                
                // Check the balances in this statement do not merge with the previous one, it acts weirdly ignoring the previous statements
                await expect(txResponse).to.changeEtherBalance(actors.bobTheBorrower.getAddress(), ethers.parseEther("1"))

                // Charles now wants to get the fee from the protocol reserve
                await expect(actors.charlesTheProtocolAdmin.sendFundsFromReserve(actors.charlesTheProtocolAdmin.getAddress(), ethers.parseUnits("18.023830670108596738", DECIMAL_18).toString() ))
                    .to.emit(registry.protocolReserve, "TradableTokenWithdrawn")
                        .withArgs(actors.charlesTheProtocolAdmin.getAddress(), ethers.parseUnits("18.023830670108596738", DECIMAL_18))
                    .to.emit(registry.tradableToken, "Transfer")
                        .withArgs(registry.protocolReserveAddress, actors.charlesTheProtocolAdmin.getAddress(), ethers.parseUnits("18.023830670108596738", DECIMAL_18))   
                        
                        
        })


    })


});