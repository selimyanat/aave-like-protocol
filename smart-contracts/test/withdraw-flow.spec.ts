
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import ContractRegistry from "./contracts/ContractRegistry";
import TestActorsRegistry from "./actors/TestActorsRegistry";
import {TWO_HUNDRED_THOUSAND,FOUR_HUNDRED_THOUSAND, ZERO, ZERO_ADDRESS, DECIMAL_18, ONE_HUNDRED_THOUSAND, ONE_DAY, ONE_YEAR,} from "./utils/Constants";
import BlockchainUtils from "./utils/BlockchainUtils";


describe("Withdraw flow", function() {

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        await actors.tradableTokenFoundation.airDrop(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        //await actors.charlesTheProtocolAdmin.transferTradableTokensTo(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Alice withdraw her tradable tokens", async function(){

        it ("Returns to Alice her initial deposit plus interests earned after a year", async function () {
            
            await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND.toString());
            // simulate another deposit so that we can pay back the alice's deposit with interests
            //await actors.charlesTheProtocolAdmin.transferTradableTokensTo(actors.vitoTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
            await actors.tradableTokenFoundation.airDrop(actors.vitoTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());

            await actors.vitoTheLender.deposit(TWO_HUNDRED_THOUSAND.toString(), ONE_DAY);

            await expect(actors.aliceTheLender.fullWithdraw(TWO_HUNDRED_THOUSAND.toString(), ONE_YEAR))
            .to.emit(registry.pool, "FundsWithdrawn")
                .withArgs(
                    actors.aliceTheLender.getAddress(), // depositor
                    ethers.parseUnits("212874.632295956464200000", DECIMAL_18), // deposit amount with interests               
                    ethers.parseUnits("187125.367704043535800000", DECIMAL_18), // total liquidty: initial liquidity - deposit amount with interests
                    ZERO.toString(), // total borrows                 
                    ZERO.toString() // utilization rate
            )
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                .withArgs(await registry.borrowingRate.getBaseBorrowingRate())
            .to.emit(registry.lendingRate, "LendingRateUpdated")
                .withArgs(ethers.parseUnits("0.064", DECIMAL_18))
            .to.emit(registry.ibToken, "ExchangeRateUpdated")
                .withArgs(ethers.parseUnits("1.064373161479782321", DECIMAL_18))
            .to.emit(registry.ibToken, "Transfer")
                .withArgs(actors.aliceTheLender.getAddress(), ZERO_ADDRESS, TWO_HUNDRED_THOUSAND)
            .to.emit(registry.tradableToken, "Transfer")
                .withArgs(registry.poolAddress, actors.aliceTheLender.getAddress(), ethers.parseUnits("212874.632295956464200000", DECIMAL_18))
            
            expect(await registry.debtToken.getDebtIndex())
            .to.be
                .equal(await registry.debtToken.getInitialDebtIndex(), "The debt token index must be equal to the initial debt index")
        })

        it ("Refuses the withdrawal to Alice if there is not enough funds to cover the withdrawal", async function () {

            await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND.toString());

            await expect(actors.aliceTheLender.fullWithdraw(TWO_HUNDRED_THOUSAND.toString(), ONE_YEAR))
            .to.be
                .revertedWith("The amount of token and interests cannot be withdrawn, because of insufficient liquidity")

        })


    })

})