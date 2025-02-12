import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ContractRegistry from "../contracts/ContractRegistry";
import { TransactionResponse } from "ethers";

export default class Liquidator {

    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<Liquidator> {
        return new Liquidator(account);
    }

    async getBorrowedTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.borrowedToken.balanceOf(this.account.getAddress());
    }

    async liquidate(borrower: string, amount: string, days?: number): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.ibToken.setMockTimestamp(seconds);
        }
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        await connectToBorrowedToken.approve(registry.poolAddress, amount);
        const connect = registry.pool.connect(this.account);
        return await connect.liquidate(borrower);
    }
    
    public getAddress(): string {
        return this.account.address;
    }

    async getCollateralBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        return await connectToBorrowedToken.balanceOf(this.account.getAddress());
    }

}