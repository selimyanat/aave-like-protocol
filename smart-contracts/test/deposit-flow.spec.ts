
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import ContractRegistry from "./contracts/ContractRegistry";
import TestActorsRegistry from "./actors/TestActorsRegistry";
import {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO, ZERO_ADDRESS, DECIMAL_18, ONE_HUNDRED_THOUSAND} from "./utils/Constants";
import BlockchainUtils from "./utils/BlockchainUtils";


describe("Deposit flow", function() {

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
        
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Alice makes a deposit in liquidity pool", async function () {

        it ("Rejects the deposit if the amount of token is zero", async function(){

            await expect(actors.aliceTheLender.deposit(ZERO.toString()))
            .to.be
                .revertedWith("The deposit must be greater than 0")
        })

        it("Adds the tradable tokens the pool and transfer to Alice interest bearing tokens in exchange", async function () {
            
            await expect(actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND.toString()))
            .to.emit(registry.pool, "DepositAdded")
                .withArgs(
                    actors.aliceTheLender.getAddress(), // depositor
                    registry.tradableTokenAddress,  // token
                    TWO_HUNDRED_THOUSAND.toString(), // deposit amount
                    TWO_HUNDRED_THOUSAND.toString(), // total liquidty
                    ZERO.toString(), // total borrows                 
                    ZERO.toString() // utilization rate
            )
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                .withArgs(await registry.borrowingRate.getBaseBorrowingRate())
            .to.emit(registry.lendingRate, "LendingRateUpdated")
                .withArgs(ethers.parseUnits("0.064", DECIMAL_18))
            .to.emit(registry.ibToken, "Transfer")
                .withArgs(ZERO_ADDRESS, actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND)

            expect(await registry.tradableToken.balanceOf(registry.poolAddress))
            .to.be
                .equal(TWO_HUNDRED_THOUSAND, "The pool balance in tradable token must be equal to Alice's deposit")
            expect(await actors.aliceTheLender.getIBTokenBalance())
            .to.be
                .equal(TWO_HUNDRED_THOUSAND, "Alice balance in Intest bearing token should be the the product of the balance in Tradable token deposited and their exchange rate")
            expect(await actors.aliceTheLender.getTradableTokenBalance())
            .to.be
                .equal(ZERO, "Alice balance in tradable token must be zero")
            
            expect(await registry.ibToken.getExchangeRate())
            .to.be
                .equal(ethers.parseUnits("1.000175342465753424", DECIMAL_18).toString(), "The interest bearing token exchange rate has slightly increased due to the accrued interests") 
            expect(await registry.debtToken.getDebtIndex())
            .to.be
                .equal(await registry.debtToken.getInitialDebtIndex(), "The debt token index must be equal to the initial debt index")
        })
    })
})