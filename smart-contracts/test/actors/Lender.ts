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

    async getTradableTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.tradableToken.balanceOf(this.account.getAddress());
    }

    // TODO REMOVE ME, This method is not used in the test
    async approveTokenTransferTo(toAddress: string, amount: string): Promise<void> {
        const registry = await ContractRegistry.getInstance();
        const connect = registry.tradableToken.connect(this.account);
        await connect.approve(toAddress, amount);        
    }

    async deposit(amount: string, days?: number): Promise<ContractTransactionResponse> {

        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.debtToken.setMockTimestamp(seconds);
        }        
        const connectToTradableToken = registry.tradableToken.connect(this.account);
        await connectToTradableToken.approve(registry.poolAddress, amount);
        const connectToPool = registry.pool.connect(this.account);
        return await connectToPool.deposit(amount);    
    }

    async fullWithdraw(amount: string, days?: number): Promise<ContractTransactionResponse> {        
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.debtToken.setMockTimestamp(seconds);
        }   
        const connectToPool = registry.pool.connect(this.account);
        return await connectToPool.fullWithdraw(amount)
    }

    async getIBTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return registry.ibToken.balanceOf(this.getAddress());
    }

    public getAddress(): string {
        return this.account.address;
    }

}