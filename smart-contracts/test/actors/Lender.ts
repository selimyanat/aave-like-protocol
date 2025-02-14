import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ContractTransactionResponse } from "ethers";
import ContractRegistry from "../contracts/ContractRegistry";

export default class Lender {

    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<Lender> {
        return new Lender(account);
    }

    async getBorrowedTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.borrowedToken.balanceOf(this.account.getAddress());
    }

    async deposit(amount: string): Promise<ContractTransactionResponse> {

        const registry = await ContractRegistry.getInstance();        
        const connectToBorrowedToken = registry.borrowedToken.connect(this.account);
        await connectToBorrowedToken.approve(registry.poolAddress, amount);
        const connectToPool = registry.pool.connect(this.account);
        return await connectToPool.deposit(amount);    
    }

    async withdrawAll(): Promise<ContractTransactionResponse> {        
        const registry = await ContractRegistry.getInstance();
        const connectToPool = registry.pool.connect(this.account);
        return await connectToPool.withdraw()
    }

    async estimateTotalEarned(days?: number): Promise<string> {
        const registry = await ContractRegistry.getInstance();
        return (await registry.ibToken.estimateTotalEarned(this.getAddress())).toString();
    }

    async getIBTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.ibToken.balanceOf(this.getAddress());
    }

    public getAddress(): string {
        return this.account.address;
    }

}