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

    async liquidate(borrower: string, amount: string): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
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