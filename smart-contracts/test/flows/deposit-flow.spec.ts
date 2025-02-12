
import { expect } from "chai";
import ContractRegistry from "../contracts/ContractRegistry";
import TestActorsRegistry from "../actors/TestActorsRegistry";
import {ZERO_ADDRESS } from "../utils/Constants";
import ScaledAmount, {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO} from "../utils/ScaledAmount";
import BlockchainUtils from "../utils/BlockchainUtils";


describe("Deposit flow", function() {

    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        await actors.borrowedTokenFaucet.transferTokens(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND);
        await actors.borrowedTokenFaucet.transferTokens(actors.gregTheLiquidator.getAddress(), FOUR_HUNDRED_THOUSAND);
        
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Alice attempts to deposit tokens in the liquidity pool", async function () {

        it ("Should reject the deposit if the amount of token is zero", async function(){

            await expect(actors.aliceTheLender.deposit(ZERO))
            .to.be
                .revertedWith("The deposit must be greater than 0")
        })

        it("Should successfully deposit tokens and receive interest bearing tokens in exchange", async function () {
            
            await expect(actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND))
            .to.emit(registry.pool, "DepositAdded")
                .withArgs(
                    actors.aliceTheLender.getAddress(), // depositor
                    registry.borrowedTokenAddress,  // token
                    TWO_HUNDRED_THOUSAND, // deposit amount
                    TWO_HUNDRED_THOUSAND, // total liquidty
                    ZERO, // total borrows                 
                    ZERO // utilization rate
            )
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                .withArgs(await registry.borrowingRate.getBaseBorrowingRate())
            .to.emit(registry.lendingRate, "LendingRateUpdated")
                .withArgs(ScaledAmount.of("0.064").value())
            .to.emit(registry.ibToken, "Transfer")
                .withArgs(ZERO_ADDRESS, actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND)

            expect(await registry.borrowedToken.balanceOf(registry.poolAddress))
            .to.be
                .equal(TWO_HUNDRED_THOUSAND, "The pool balance in tokens must be equal to Alice's deposit")
            expect(await actors.aliceTheLender.getIBTokenBalance())
            .to.be
                .equal(TWO_HUNDRED_THOUSAND, "Alice's balance in Intest bearing token should be the the product of the balance in tokens deposited and their exchange rate")
            expect(await actors.aliceTheLender.getBorrowedTokenBalance())
            .to.be
                .equal(ZERO, "Alice's balance in tokens must be zero")            
            expect(await registry.ibToken.getExchangeRate())
            .to.be    
                .equal(ScaledAmount.of("1.000175342465753424").value(), "The interest bearing token exchange rate has slightly increased due to the accrued interests") 
            expect(await registry.debtToken.getDebtIndex())
            .to.be
                .equal(await registry.debtToken.getInitialDebtIndex(), "The debt token index must be equal to the initial debt index")
        })
    })
})