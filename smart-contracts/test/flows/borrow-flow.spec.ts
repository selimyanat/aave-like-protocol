
import { expect } from "chai";
import ContractRegistry from "../contracts/ContractRegistry";
import TestActorsRegistry from "../actors/TestActorsRegistry";
import {ZERO_ADDRESS, ONE_DAY } from "../utils/Constants";
import ScaledAmount, {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO, ONE_THOUSAND, TWO_THOUSAND, ONE, MINUS_ONE} from "../utils/ScaledAmount";
import BlockchainUtils from "../utils/BlockchainUtils";


describe("Borrow flow", function() {

    // Pool and token contracts
    let registry: ContractRegistry;
    let actors: TestActorsRegistry;

    let blokchainStateId: string;

    beforeEach(async function () {
        
        registry = await ContractRegistry.getInstance();
        actors = await TestActorsRegistry.getInstance();
        
        await actors.tradableTokenFoundation.airDrop(actors.aliceTheLender.getAddress(), TWO_HUNDRED_THOUSAND);
        await actors.aliceTheLender.deposit(TWO_HUNDRED_THOUSAND, ONE_DAY)
        
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Bob attempts to borrow tradable tokens", async function() {


        it("Should rejects the borrowing if Bob attempts to borrow a zero or negative amount", async function () {

            await expect(actors.bobTheBorrower.borrow(ZERO, ONE))
            .to.be
                .revertedWith("The amount of token borrowed must be greater than 0")
        })

        it("Should rejects the borrowing if Bob attempts to borrow more than the available liquidity", async function () {

            await expect(actors.bobTheBorrower.borrow(FOUR_HUNDRED_THOUSAND, ONE))
            .to.be
                .revertedWith("The amount of token borrowed must be less than the available liquidity")
        })

        it ("Should rejects the borrowing if Bob attempts to borrow without a collateral", async function () {

            await expect(actors.bobTheBorrower.borrow(ONE_THOUSAND, ZERO))
            .to.be
                .revertedWith("The amount of token borrowed must have a collateral")
        })

        it ("Should rejects the borrowing if Bob attempts to borrow with an insufficient collateral", async function () {

            await expect(actors.bobTheBorrower.borrow(TWO_THOUSAND, ScaledAmount.of("0.25").value()))
            .to.be
                .revertedWith("The collateral ratio must be greater or equal than the collateral factor")
        })

        it ("Should rejects the borrowing if Bob attempts to borrow with a collateral not enough to have a safe health factor", async function () {

            await expect(actors.bobTheBorrower.borrow(TWO_THOUSAND, ScaledAmount.of("0.75").value()))
            .to.be
                .revertedWith("The borrower health factor must be greater than 1 to allow the borrowing")
        })

        it ("Should successfully allow Bob to borrow tradable tokens with a sufficient collateral and health factor", async function () {
            
            const tx1Response = await actors.bobTheBorrower.borrow(ONE_THOUSAND, ONE)
            await expect(tx1Response)
            .to.emit(registry.pool, "Borrowing")
                .withArgs(
                    actors.bobTheBorrower.getAddress(), // borrower
                    ONE_THOUSAND, // amount of token borrowed
                    ScaledAmount.of("199000").value(), // total liquidity
                    ONE_THOUSAND, // total borrows
                    ScaledAmount.of("0.005").value()) // utilization rate)
            .to.emit(registry.tradableToken, "Transfer")
                .withArgs(registry.poolAddress, actors.bobTheBorrower.getAddress(), ONE_THOUSAND)                                    
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")            
                .withArgs(ScaledAmount.of("0.080500000000000000").value())         
            .to.emit(registry.lendingRate, "LendingRateUpdated")            
                .withArgs(ScaledAmount.of("0.0644").value())
            .to.emit(registry.debtToken, "Transfer")            
                .withArgs(ZERO_ADDRESS, actors.bobTheBorrower.getAddress(), ScaledAmount.of("1000.219178082191780000").value())  
            .to.emit(registry.debtToken, "DebtIndexUpdated")            
                .withArgs(ScaledAmount.of("1.000439726027397259").value())
            expect(await actors.bobTheBorrower.getDebtTokenBalance())
            .to.be
                .equal(ScaledAmount.of("1000.219178082191780000").value(), "The total debt token balance must be higher than the borrowed token")
            expect(await registry.ibToken.getExchangeRate())
            .to.be            
                .equal(ScaledAmount.of("1.000175342465753424").value(), "The interest bearing token exchange rate has not changed since Alice's deposit")
            // Check the balances in this statement do not merge with the previous one, it acts weirdly ignoring the previous statements
            await expect(tx1Response).to.changeEtherBalance(actors.bobTheBorrower.getAddress(), MINUS_ONE);

            // Bob wants to borrow more tokens            
            const tx2Response = await actors.bobTheBorrower.borrow(ONE_THOUSAND, ONE);            
            await expect(tx2Response)
            .to.emit(registry.pool, "Borrowing")
                .withArgs(
                    actors.bobTheBorrower.getAddress(), // borrower
                    ONE_THOUSAND, // amount of token borrowed
                    ScaledAmount.of("198000").value(), // total liquidity
                    TWO_THOUSAND, // total borrows                    
                    ScaledAmount.of("0.01").value()) // utilization rate) 
            .to.emit(registry.tradableToken, "Transfer")
                .withArgs(registry.poolAddress, actors.bobTheBorrower.getAddress(), ONE_THOUSAND)
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                .withArgs(ScaledAmount.of("0.081000000000000000").value())
            .to.emit(registry.lendingRate, "LendingRateUpdated")
                .withArgs(ScaledAmount.of("0.0648").value())                                                                                
            .to.emit(registry.debtToken, "Transfer")
                .withArgs(ZERO_ADDRESS, actors.bobTheBorrower.getAddress(), ScaledAmount.of("1000.660273972602738000").value())  
            .to.emit(registry.debtToken, "DebtIndexUpdated")
                .withArgs(ScaledAmount.of("1.000882191780821916").value())
            // Check the balances in this statement do not merge with the previous one, it acts weirdly ignoring the previous statements            
            await expect(tx2Response).to.changeEtherBalance(actors.bobTheBorrower.getAddress(), MINUS_ONE.toString());
        })

    })

})