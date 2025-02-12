import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, TransactionResponse } from "ethers";
import ContractRegistry from "../contracts/ContractRegistry";

export default class Borrower {

    private account: HardhatEthersSigner;
    
    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<Borrower> {
        return new Borrower(account);
    }

    async getBorrowedTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.borrowedToken.balanceOf(this.account.getAddress());
    }

    async getDebtTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.debtToken.balanceOf(this.account.getAddress());
    }

    public getAddress(): string {
        return this.account.address;
    }

    async borrow(amountToBorrow: string, collateralAmount: string, days?:number): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.ibToken.setMockTimestamp(seconds);
        }        
        const connectToCollateralToken = registry.collateralToken.connect(this.account);
        await connectToCollateralToken.approve(registry.poolAddress, collateralAmount);
        const connect = registry.pool.connect(this.account);    
        return await connect.borrow(amountToBorrow, collateralAmount);
    }

    async repayAll(amount: string, days?: number): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.debtToken.setMockTimestamp(seconds);
        }
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        await connectToBorrowedToken.approve(registry.poolAddress, amount);
        const connect = registry.pool.connect(this.account);
        return await connect.repay();
    }

    async getCollateralBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        return await connectToBorrowedToken.balanceOf(this.account.getAddress());
    }


}