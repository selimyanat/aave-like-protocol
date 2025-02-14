
import { expect } from "chai";
import ContractRegistry from "../contracts/ContractRegistry";
import TestActorsRegistry from "../actors/TestActorsRegistry";
import {ZERO_ADDRESS, ONE_DAY, ONE_YEAR,} from "../utils/Constants";
import ScaledAmount, {TWO_HUNDRED_THOUSAND, ZERO} from "../utils/ScaledAmount";
import BlockchainUtils from "../utils/BlockchainUtils";
import { Block } from "ethers";
import TimeForwarder from "../utils/TimeForwarder";


describe("Withdraw flow", function() {

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        await actors.borrowedTokenFaucet.transferTokens(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND.toString());
        
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Alice withdraw her tokens", async function() {

        it ("Should return to Alice her initial deposit plus interests earned after a year", async function () {
            
            await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND.toString());
            // simulate another deposit so that we can pay back the alice's deposit with interests
            await actors.borrowedTokenFaucet.transferTokens(actors.vitoTheLender.getAddress(), TWO_HUNDRED_THOUSAND);
            await TimeForwarder.getInstance().forwardTime(ONE_DAY);
            await actors.vitoTheLender.deposit(TWO_HUNDRED_THOUSAND);

            await TimeForwarder.getInstance().forwardTime(ONE_YEAR);
            const estimatedInterests = await actors.aliceTheLender.estimateTotalEarned();
            expect(estimatedInterests).to.be.equal(ScaledAmount.of("212911.958258879590400000").value());    

            await expect(actors.aliceTheLender.withdrawAll())
            .to.emit(registry.pool, "FundsWithdrawn")
                .withArgs(
                    actors.aliceTheLender.getAddress(), // depositor
                    estimatedInterests, // deposit amount with interests
                    ScaledAmount.of("187088.041741120409600000").value(), // total liquidty: initial liquidity - deposit amount with interests
                    ZERO.toString(), // total borrows                 
                    ZERO.toString() // utilization rate
            )
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                .withArgs(await registry.borrowingRate.getBaseBorrowingRate())
            .to.emit(registry.lendingRate, "LendingRateUpdated")
                .withArgs(ScaledAmount.of("0.064").value())
            .to.emit(registry.ibToken, "ExchangeRateUpdated")
                .withArgs(ScaledAmount.of("1.132691617937239420").value())                                
            .to.emit(registry.ibToken, "Transfer")
                .withArgs(actors.aliceTheLender.getAddress(), ZERO_ADDRESS, TWO_HUNDRED_THOUSAND)                
            .to.emit(registry.borrowedToken, "Transfer")
                .withArgs(registry.poolAddress, actors.aliceTheLender.getAddress(), estimatedInterests)
            expect(await registry.debtToken.getDebtIndex())
            .to.be
                .equal(await registry.debtToken.getInitialDebtIndex(), "The debt token index must be equal to the initial debt index")                
        })

        it ("Should reject the withdrawal to Alice if there is not enough funds to cover the withdrawal", async function () {

            await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND);
            await TimeForwarder.getInstance().forwardTime(ONE_YEAR);

            await expect(actors.aliceTheLender.withdrawAll())
            .to.be
                .revertedWith("The amount of token and interests cannot be withdrawn, because of insufficient liquidity")

        })


    })

})