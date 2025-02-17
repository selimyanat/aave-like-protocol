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

    async borrow(amountToBorrow: string, collateralAmount: string): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        const connectToCollateralToken = registry.collateralToken.connect(this.account);
        await connectToCollateralToken.approve(registry.poolAddress, collateralAmount);
        const connect = registry.pool.connect(this.account);    
        return await connect.borrow(amountToBorrow, collateralAmount);
    }

    async repayAll(amount: string): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        await connectToBorrowedToken.approve(registry.poolAddress, amount);
        const connect = registry.pool.connect(this.account);
        return await connect.repay();
    }

    async estimateTotalDebt(): Promise<string> {
        const registry = await ContractRegistry.getInstance();
        return (await registry.debtToken.estimateTotalDebtOwed(this.getAddress())).toString();
    }

    async getCollateralBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        return await connectToBorrowedToken.balanceOf(this.account.getAddress());
    }


}