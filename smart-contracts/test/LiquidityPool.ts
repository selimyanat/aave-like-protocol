import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { InterestBearingTestToken, LiquidityPool, TestToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";



describe.skip("LiquidityPool", function() {

    const TOKEN_NAME = "Test Token"
    const TOKEN_SYMBOL = "TST"
    const IB_TOKEN_NAME = "Interest Bearing Test Token"
    const IB_TOKEN_SYMBOL = "IBTST"
    const TOKEN_DECIMALS = 18
    const TOKEN_TOTAL_SUPPLY = ethers.parseUnits("1000000000", TOKEN_DECIMALS);

    // equivalent to 50%
    const COLLATERAL_FACTOR = ethers.parseUnits("0.5", 18);

    let testToken: TestToken
    let ibToken: InterestBearingTestToken
    let liquidityPool: LiquidityPool
    let deployer: HardhatEthersSigner
    let alice: HardhatEthersSigner
    let bob: HardhatEthersSigner
    let greg: HardhatEthersSigner
    let snapshotId: string

    // We need to first deploy the token and the pool contracts
    // assign to the user the tokens
    // approve the token transfer by the user
    // call the addLiquidity function
    // check the totakl liquidity for the token

    beforeEach(async function () {
        // deploy the token contract
        const TestTokenContract = await hre.ethers.getContractFactory("TestToken");
        const IBTestTokenContract = await hre.ethers.getContractFactory("InterestBearingTestToken");
        testToken = await TestTokenContract.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_TOTAL_SUPPLY);
        ibToken = await IBTestTokenContract.deploy(IB_TOKEN_NAME, IB_TOKEN_SYMBOL);

        // deploy the pool contract
        const LiquidityPoolContract = await hre.ethers.getContractFactory("LiquidityPool")
        const tokenAddress = await testToken.getAddress()
        const ibTokenAddress = await ibToken.getAddress()
        liquidityPool = await LiquidityPoolContract.deploy(tokenAddress, ibTokenAddress, COLLATERAL_FACTOR);

        const accounts = await ethers.getSigners();
        deployer = accounts[0]
        alice = accounts[1]
        bob = accounts[2]
        greg = accounts[3]

        // assign some tokens to alice
        const tokenTransferToAlice = ethers.parseUnits("200000", TOKEN_DECIMALS);
        await testToken.transfer(alice.address, tokenTransferToAlice)

        // assign some tokens to greg
        const tokenTransferToGreg = ethers.parseUnits("400000", TOKEN_DECIMALS);
        await testToken.transfer(greg.address, tokenTransferToGreg)

        // Take a snapshot of the current state
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    })

    afterEach(async function () {
        // Revert the state to the snapshot
        await ethers.provider.send("evm_revert", [snapshotId]);
    })

    it.skip("Should set that the contracts are all deployed and well-configured", async function () {
        // Verify token contract setup
        const name = await testToken.name();
        expect(name).to.equal(TOKEN_NAME);
        const symbol = await testToken.symbol();
        expect(symbol).to.equal(TOKEN_SYMBOL);
        const decimals = await testToken.decimals();
        expect(decimals).to.equal(TOKEN_DECIMALS);
        const totalSupply = await testToken.totalSupply();
        expect(totalSupply).to.equal(TOKEN_TOTAL_SUPPLY);

        // Verify ibToken contract setup
        const ibName = await ibToken.name();
        expect(ibName).to.equal(IB_TOKEN_NAME);
        const ibSymbol = await ibToken.symbol();
        expect(ibSymbol).to.equal(IB_TOKEN_SYMBOL);
        const ibDecimals = await ibToken.decimals();
        expect(ibDecimals).to.equal(TOKEN_DECIMALS);
        const ibTotalSupply = await ibToken.totalSupply();
        expect(ibTotalSupply).to.equal(0);

        // Verify alice balance
        const balanceOfAlice = await testToken.balanceOf(alice.address);
        const expectedBalanceOfAlice = ethers.parseUnits("200000", TOKEN_DECIMALS);
        expect(balanceOfAlice).to.equal(expectedBalanceOfAlice);
        

        // Verify Greg balance
        const balanceOfGreg = await testToken.balanceOf(greg.address);
        const expectedBalanceOfGreg = ethers.parseUnits("400000", TOKEN_DECIMALS);
        expect(balanceOfGreg).to.equal(expectedBalanceOfGreg);

        // Verify liquidity pool contract
        const totalLiquidity = await liquidityPool.getTotalLiquidity();
        const expectedTotalLiquidity = 0
        expect(totalLiquidity).to.equal(expectedTotalLiquidity);

        // Verify total borrows pool contract
        const totalBorrows = await liquidityPool.getTotalBorrows();
        const expectedTotalBorrows = 0
        expect(totalBorrows).to.equal(expectedTotalBorrows);
    })

    it.skip("Should add liquidity to the pool", async function () {

        // Add liquidity to the pool from alice account
        const tokensToAddToLiquiityPoolWithoutDecimal = "2"
        const tokensToAddToLiquiityPool = ethers.parseUnits("200000", TOKEN_DECIMALS);
        const liquidityPoolAddress = await liquidityPool.getAddress()    
        let aliceBalance = await testToken.balanceOf(alice.address);
        expect(aliceBalance).to.be.gte(tokensToAddToLiquiityPool);

        // Approve the liquidity contract to get tokens from alice
        const testTokenWithAlice = testToken.connect(alice);
        await testTokenWithAlice.approve(liquidityPoolAddress, tokensToAddToLiquiityPool)
        const allowance = await testToken.allowance(alice.address, liquidityPoolAddress) 
        expect(allowance).to.equal(tokensToAddToLiquiityPool)

        // Alice add liquidity to the pool
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        const testTokenAddress = await testToken.getAddress()
        await expect(liquidityPoolWithAlice.addLiquidity(tokensToAddToLiquiityPool))
            .to.emit(liquidityPool, "LiquidityAdded")
            .withArgs(alice.address, testTokenAddress, tokensToAddToLiquiityPool);

   
        // Verify that the liquidity pool has the correct amount of tokens
        const totalLiquidity = await liquidityPool.getTotalLiquidity();
        expect(totalLiquidity).to.equal(tokensToAddToLiquiityPool);
        // Verify that the total borrows is still 0
        const totalBorrows = await liquidityPool.getTotalBorrows();
        const expectedTotalBorrows = 0
        expect(totalBorrows).to.equal(expectedTotalBorrows);
        // Verify that the alice balance has been decreased by the amount of tokens added to the pool
        aliceBalance = await testToken.balanceOf(alice.address);
        const expectedAliceBalance = ethers.parseUnits("0", TOKEN_DECIMALS);
        expect(aliceBalance).to.equal(expectedAliceBalance);
        // verify that the liquidity pool balance has been increased by the amount of tokens added to the pool in the token contract
        const liquidityPoolBalance = await testToken.balanceOf(liquidityPoolAddress);
        expect(liquidityPoolBalance).to.equal(tokensToAddToLiquiityPool);    
        
        // assert the utilization rate
        const utilizationRate = await liquidityPool.getUtilizationRate();
        const expectedUtilizationRate = 0
        expect(utilizationRate).to.equal(expectedUtilizationRate);
    });

    it.skip("Should not allow to borrow tokens when liquidity pool is empty", async function () {

        const testTokenAddress = await testToken.getAddress()
        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);

        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Insufficient liquidity in the pool");

    })

    it.skip("Should borrow tokens from the pool with over-collateral, that is above the collateral factor", async function () {

        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        // the collateral needs to be higher or equal to the amount borrowed
        // message value is expressed in wei
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));

        // Assert bob has been transfered the tokens
        const bobBalance = await testToken.balanceOf(bob.address);
        const expectedBobBalance = ethers.parseUnits("2000", TOKEN_DECIMALS);
        expect(bobBalance).to.equal(expectedBobBalance);

        // Assert Bob total borrows balance has been increased
        const bobBorrowBalance = await liquidityPool.getBorrowedAmount(bob.address);
        const expectedBobBorrowBalance = tokensToBorrow;
        expect(bobBorrowBalance).to.equal(expectedBobBorrowBalance);

        // Assert the total borrows has been increased        
        const totalBorrows = await liquidityPool.getTotalBorrows();
        const expectedTotalBorrows = ethers.parseUnits("2000", TOKEN_DECIMALS);
        expect(totalBorrows).to.equal(expectedTotalBorrows);
        
        // Assert the total liquidity has been decreased
        const totalLiquidity = await liquidityPool.getTotalLiquidity();
        const expectedTotalLiquidity = ethers.parseUnits("198000", TOKEN_DECIMALS);
        expect(totalLiquidity).to.equal(expectedTotalLiquidity);
    
        // Assert the utilization rate has been increased
        const utilizationRate = await liquidityPool.getUtilizationRate();
        // 0.5 in 18-decimal fixed-point
        const expectedUtilizationRate = ethers.parseUnits("0.01", 18); 
        expect(utilizationRate).to.equal(expectedUtilizationRate);        
    })

    it.skip('Should not allow borrow with less than the collateral factor', async function () {
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))
 
        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        // undercollateralized the loan should revert
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("0.25") }))
        .to.be.revertedWith("Collateral ratio should be higher or equal to the collateral factor");
    })

    it.skip('Should not allow borrow because the collateral is not enough to have a safe health factor', async function () {
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))
 
        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Health factor should be greater than 1");
    })

    it.skip('Should withdraw the tokens deposited', async function () {

        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // Withdraw the tokens from the pool
        const liquidityPoolWithAliceWithdraw = liquidityPool.connect(alice);
        const tokensToWithdraw = ethers.parseUnits("200000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithAliceWithdraw.withdraw(tokensToWithdraw))
            .to.emit(liquidityPool, "Withdrawn")
            .withArgs(alice.address, testTokenAddress, tokensToWithdraw, 0, 0);

        // Assert the total liquidity has been decreased
        const totalLiquidity = await liquidityPool.getTotalLiquidity();
        const expectedTotalLiquidity = ethers.parseUnits("0", TOKEN_DECIMALS);
        expect(totalLiquidity).to.equal(expectedTotalLiquidity);

        // Assert the alice balance has been increased
        const aliceBalance = await testToken.balanceOf(alice.address);
        const expectedAliceBalance = ethers.parseUnits("200000", TOKEN_DECIMALS);
        expect(aliceBalance).to.equal(expectedAliceBalance);

        // Assert the liquidity pool balance has been decreased
        const liquidityPoolAddress = await liquidityPool.getAddress()
        const liquidityPoolBalance = await testToken.balanceOf(liquidityPoolAddress);
        expect(liquidityPoolBalance).to.equal(0);

        // assert the utilization rate
        const utilizationRate = await liquidityPool.getUtilizationRate();
        const expectedUtilizationRate = 0
        expect(utilizationRate).to.equal(expectedUtilizationRate);        
    })

    it.skip('Should repay the tokens borrowed', async function () {
        
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        // the collateral needs to be higher or equal to the amount borrowed
        // message value is expressed in wei
        let bobBalanceInNativeToken = await ethers.provider.getBalance(bob.address)
        console.log(`Balance before borrow: ${ethers.formatEther(bobBalanceInNativeToken)} ETH`);
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));
        bobBalanceInNativeToken = await ethers.provider.getBalance(bob.address)
        console.log(`Balance after borrow: ${ethers.formatEther(bobBalanceInNativeToken)} ETH`);
        expect(bobBalanceInNativeToken).to.be.closeTo(ethers.parseEther("9998"), ethers.parseEther("0.001"))

        // Repay the tokens borrowed
        const testTokenWithBob = testToken.connect(bob);
        await testTokenWithBob.approve(liquidityPool.getAddress(), tokensToBorrow)
        const allowance = await testToken.allowance(bob.address, liquidityPool.getAddress())
        expect(allowance).to.equal(tokensToBorrow)

        const liquidityPoolWithBobRepay = liquidityPool.connect(bob);
        await expect(liquidityPoolWithBobRepay.repay(tokensToBorrow))
            .to.emit(liquidityPool, "Repayed")
            .withArgs(bob.address, testTokenAddress, ethers.parseUnits("2000", TOKEN_DECIMALS),0, 0, 0);

        bobBalanceInNativeToken = await ethers.provider.getBalance(bob.address)
        console.log(`Balance after repay: ${ethers.formatEther(bobBalanceInNativeToken)} ETH`);
        expect(bobBalanceInNativeToken).to.be.closeTo(ethers.parseEther("10000"), ethers.parseEther("0.001"))
    })

    it.skip('Should not allow to repay more than the borrowed amount', async function () {

        //require(amount > 0, "Amount should be greater than 0");
        //require(borrowAmounts[msg.sender] >= amount, "Insufficient balance, only full payment is allowed");
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))


        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));
        
        // Repay the tokens borrowed with less than the borrowed amount
        const partialRepay = ethers.parseUnits("1000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithBob.repay(partialRepay))
        .to.be.revertedWith("Insufficient balance, only full payment is allowed");
    })

    it.skip('Should allow to liquidate the borrower position', async function () {

        // Alice add liquidity to the pool
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));
        
        // update the collateral price, connect the liquidty pool as deployer
        const liquidityPoolWithDeployer = liquidityPool.connect(deployer);
        // From 2 -> 0.8
        const newCollateralPrice = ethers.parseUnits("0.8", 18);
        await expect(liquidityPoolWithDeployer.updateCollateralPrice(newCollateralPrice))
        .to.emit(liquidityPool, "CollateralPriceUpdated")
        .withArgs(newCollateralPrice);

        // Approve the liquidity contract to get tokens from greg
        let gregBalanceInNativeToken = await ethers.provider.getBalance(greg.address)
        console.log(`Greg balance before liquidation: ${ethers.formatEther(gregBalanceInNativeToken)} ETH`);
        const liquidityPoolAddress = await liquidityPool.getAddress()
        const tokensToAddToLiquiityPoolByGreg = ethers.parseUnits("2000", TOKEN_DECIMALS);  
        const testTokenWithGreg = testToken.connect(greg);
        await testTokenWithGreg.approve(liquidityPoolAddress, tokensToAddToLiquiityPoolByGreg)
        const allowance = await testToken.allowance(greg.address, liquidityPoolAddress) 
        expect(allowance).to.equal(tokensToAddToLiquiityPoolByGreg)

        const liquidityPoolWithGreg = liquidityPool.connect(greg);
        await expect(liquidityPoolWithGreg.liquidate(bob.address, tokensToAddToLiquiityPoolByGreg))
        .to.emit(liquidityPool, "Liquidation")
        .withArgs(bob.address, greg.address, tokensToAddToLiquiityPoolByGreg, 0, 0, 0, ethers.parseUnits("200000", TOKEN_DECIMALS));
        gregBalanceInNativeToken = await ethers.provider.getBalance(greg.address)
        console.log(`Greg balance after liquidation: ${ethers.formatEther(gregBalanceInNativeToken)} ETH`);

        // Assert that the total tokens for greg has decreased
        const gregBalance = await testTokenWithGreg.balanceOf(greg.address);
        const expectedGregBalance = ethers.parseUnits("398000", TOKEN_DECIMALS);
        expect(gregBalance).to.eq(expectedGregBalance);

        // Assert that the collateral tokens has been transferred to greg
        // Return back 2 ethers to greg from bob
        expect(gregBalanceInNativeToken).to.be.closeTo(ethers.parseEther("10002"), ethers.parseEther("0.001"))
    })

    it.skip('Should not allow to liquidate the borrower when health factor is greater or equal 1', async function () {

        // Alice add liquidity to the pool
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));
        
        // Attempt to liquidate the borrower when health factor is greater or equal 1
        const liquidityPoolWithGreg = liquidityPool.connect(greg);
        const tokensToAddToLiquiityPoolByGreg = ethers.parseUnits("2000", TOKEN_DECIMALS);  
        await expect(liquidityPoolWithGreg.liquidate(bob.address, tokensToAddToLiquiityPoolByGreg))
        .to.be.revertedWith("Borrower is not liquidatable");
    })

    
    it.skip('Should not allow to liquidate the borrower when there is no debt', async function () {

        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // Attempt to liquidate the borrower when there is no debt
        const liquidityPoolWithGreg = liquidityPool.connect(greg);
        const tokensToAddToLiquiityPoolByGreg = ethers.parseUnits("2000", TOKEN_DECIMALS);  
        await expect(liquidityPoolWithGreg.liquidate(bob.address, tokensToAddToLiquiityPoolByGreg))
        .to.be.revertedWith("Borrower has no debt to liquidate");        
    })

    it.skip('Should not allow to liquidate the borrower when the collateral price did not drop by too much', async function () {
      
        // Alice add liquidity to the pool
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));
        
        // update the collateral price, connect the liquidty pool as deployer
        const liquidityPoolWithDeployer = liquidityPool.connect(deployer);
        // From 2 -> 1.8
        const newCollateralPrice = ethers.parseUnits("1.8", 18);
        await expect(liquidityPoolWithDeployer.updateCollateralPrice(newCollateralPrice))
        .to.emit(liquidityPool, "CollateralPriceUpdated")
        .withArgs(newCollateralPrice);

        // Approve the liquidity contract to get tokens from greg
        let gregBalanceInNativeToken = await ethers.provider.getBalance(greg.address)
        console.log(`Greg balance before liquidation: ${ethers.formatEther(gregBalanceInNativeToken)} ETH`);
        const liquidityPoolAddress = await liquidityPool.getAddress()
        const tokensToAddToLiquiityPoolByGreg = ethers.parseUnits("2000", TOKEN_DECIMALS);  
        const testTokenWithGreg = testToken.connect(greg);
        await testTokenWithGreg.approve(liquidityPoolAddress, tokensToAddToLiquiityPoolByGreg)
        const allowance = await testToken.allowance(greg.address, liquidityPoolAddress) 
        expect(allowance).to.equal(tokensToAddToLiquiityPoolByGreg)

        // Attempt to liquidate the borrower when the collateral price did not drop by too much
        const liquidityPoolWithGreg = liquidityPool.connect(greg);
        await expect(liquidityPoolWithGreg.liquidate(bob.address, tokensToAddToLiquiityPoolByGreg))
        .to.emit(liquidityPool, "Liquidation")
        .withArgs(bob.address, greg.address, tokensToAddToLiquiityPoolByGreg, 0, 0, 0, ethers.parseUnits("200000", TOKEN_DECIMALS));
        gregBalanceInNativeToken = await ethers.provider.getBalance(greg.address)
        console.log(`Greg balance after liquidation: ${ethers.formatEther(gregBalanceInNativeToken)} ETH`);

        // Assert that the total tokens for greg has decreased
        const gregBalance = await testTokenWithGreg.balanceOf(greg.address);
        const expectedGregBalance = ethers.parseUnits("398000", TOKEN_DECIMALS);
        expect(gregBalance).to.eq(expectedGregBalance);

        // Assert that the collateral tokens has been transferred to greg
        // Return back 2 ethers to greg from bob
        expect(gregBalanceInNativeToken).to.be.closeTo(ethers.parseEther("10002"), ethers.parseEther("0.001"))       
    })

    it.skip('Should not allow to liquidate the borrower when the liquidator tries to partially repay the borrower debt', async function () {
        
        const testTokenAddress = await testToken.getAddress()
        // Add liquidity to the pool from alice account
        await allowsLiquidityPoolToTransferTokenFromAlice("200000")
        const liquidityPoolWithAlice = liquidityPool.connect(alice);
        await liquidityPoolWithAlice.addLiquidity(ethers.parseUnits("200000", TOKEN_DECIMALS))

        // connect as bob and tries to borrow tokens
        const liquidityPoolWithBob = liquidityPool.connect(bob);
        const tokensToBorrow = ethers.parseUnits("2000", TOKEN_DECIMALS);
        await expect(liquidityPoolWithBob.borrows(tokensToBorrow, { value: ethers.parseEther("2") }))
        .to.emit(liquidityPool, "Borrowed")
        .withArgs(bob.address, testTokenAddress, tokensToBorrow, ethers.parseUnits("2", TOKEN_DECIMALS), ethers.parseUnits("1.6", TOKEN_DECIMALS));
        
        // Attempt to liquidate the borrower when there is no debt
        const liquidityPoolWithGreg = liquidityPool.connect(greg);
        const tokensToAddToLiquiityPoolByGreg = ethers.parseUnits("1000", TOKEN_DECIMALS);  
        await expect(liquidityPoolWithGreg.liquidate(bob.address, tokensToAddToLiquiityPoolByGreg))
        .to.be.revertedWith("Insufficient repayment amount, only full repayment is allowed");        
    })

    async function allowsLiquidityPoolToTransferTokenFromAlice(amount: string) {
        const tokensToAddToLiquityPool = ethers.parseUnits(amount, TOKEN_DECIMALS);
        const liquidityPoolAddress = await liquidityPool.getAddress()
        
        // Approve the liquidity contract to get tokens from alice
        const testTokenWithAlice = testToken.connect(alice);
        await testTokenWithAlice.approve(liquidityPoolAddress, tokensToAddToLiquityPool)

    }

}) 
