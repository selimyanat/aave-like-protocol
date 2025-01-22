
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import ContractRegistry from "./contracts/ContractRegistry";
import TestActorsRegistry from "./actors/TestActorsRegistry";
import {TWO_HUNDRED_THOUSAND, FOUR_HUNDRED_THOUSAND, ZERO, ZERO_ADDRESS, DECIMAL_18, ONE_HUNDRED_THOUSAND, ONE_THOUSAND, TWO_THOUSAND, ONE_DAY, ONE, MINUS_ONE} from "./utils/Constants";
import BlockchainUtils from "./utils/BlockchainUtils";


describe("Borrow flow", function() {

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
        
        blokchainStateId = await BlockchainUtils.saveState()
    })

    afterEach(async function () {
        await BlockchainUtils.rollbackStateTo(blokchainStateId);
        await ContractRegistry.resetInstance();
        await TestActorsRegistry.resetInstance();
    })

    describe("When Bob borrows tradable tokens", async function() {


        it("Rejects the borrowing if Bob attempts to borrow a zero or negative amount", async function () {

            await expect(actors.bobTheBorrower.borrow(ZERO.toString(), ONE.toString()))
            .to.be
                .revertedWith("The amount of token borrowed must be greater than 0")
        })

        it("Rejects the borrowing if Bob attempts to borrow more than the available liquidity", async function () {

            await expect(actors.bobTheBorrower.borrow(FOUR_HUNDRED_THOUSAND.toString(), ONE.toString()))
            .to.be
                .revertedWith("The amount of token borrowed must be less than the available liquidity")
        })

        it ("Rejects the borrowing if Bob attempts to borrow without a collateral", async function () {

            await expect(actors.bobTheBorrower.borrow(ONE_THOUSAND.toString(), ZERO.toString()))
            .to.be
                .revertedWith("The amount of token borrowed must have a collateral")
        })

        it ("Rejects the borrowing if Bob attempts to borrow with an insufficient collateral", async function () {

            await expect(actors.bobTheBorrower.borrow(TWO_THOUSAND.toString(), ethers.parseEther("0.25").toString()))
            .to.be
                .revertedWith("The collateral ratio must be greater or equal than the collateral factor")
        })

        it ("Rejects the borrowing if Bob attempts to borrow with a collateral not enough to have a safe health factor", async function () {

            await expect(actors.bobTheBorrower.borrow(TWO_THOUSAND.toString(), ethers.parseEther("0.75").toString()))
            .to.be
                .revertedWith("The borrower health factor must be greater than 1 to allow the borrowing")
        })

        it ("Allows Bob to borrow tradable tokens with a sufficient collateral and health factor", async function () {
            
            await expect(actors.bobTheBorrower.borrow(ONE_THOUSAND.toString(), ONE.toString()))
            .to.emit(registry.pool, "Borrowing")
                .withArgs(
                    actors.bobTheBorrower.getAddress(), // borrower
                    ONE_THOUSAND.toString(), // amount of token borrowed
                    ethers.parseUnits("199000", DECIMAL_18), // total liquidity
                    ONE_THOUSAND.toString(), // total borrows
                    ethers.parseUnits("0.005", DECIMAL_18)) // utilization rate)
            .to.emit(registry.tradableToken, "Transfer")
                .withArgs(registry.poolAddress, actors.bobTheBorrower.getAddress(), ONE_THOUSAND)
            .to.emit(registry.borrowingRate, "BorrowingRateUpdated")
                .withArgs(ethers.parseUnits("0.080500000000000000", DECIMAL_18))
            .to.emit(registry.lendingRate, "LendingRateUpdated")
                .withArgs(ethers.parseUnits("0.0644", DECIMAL_18))
            .to.emit(registry.debtToken, "Transfer")
                .withArgs(ZERO_ADDRESS, actors.bobTheBorrower.getAddress(), ethers.parseUnits("1008.222312328767122000", DECIMAL_18))
            .to.emit(registry.debtToken, "DebtIndexUpdated")
                .withArgs(ethers.parseUnits("1.008222312328767122", DECIMAL_18))
            .to.changeEtherBalance(actors.bobTheBorrower.getAddress(), MINUS_ONE.toString());
            
            expect(await actors.bobTheBorrower.getDebtTokenBalance())
            .to.be
                .equal(ethers.parseUnits("1008.222312328767122000", DECIMAL_18), "The total debt token balance must be higher than the borrowed token")
            expect(await registry.ibToken.getExchangeRate())
            .to.be
                .equal(ethers.parseUnits("1.000175342465753424", DECIMAL_18).toString(), "The interest bearing token exchange rate has not changed since Alice's deposit")
        })

    })

})