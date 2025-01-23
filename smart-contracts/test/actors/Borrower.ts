import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, TransactionResponse } from "ethers";
import ContractRegistry from "../contracts/ContractRegistry";

export default class Borrower {

    private initialNativeBalance?: BigInt;
    private account: HardhatEthersSigner;
    
    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<Borrower> {
        const borrower = new Borrower(account);
        borrower.initialNativeBalance = await borrower.account.provider.getBalance(account.getAddress());
        return borrower;
    }

    async getTradableTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.tradableToken.balanceOf(this.account.getAddress());
    }

    async getDebtTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.debtToken.balanceOf(this.account.getAddress());
    }

    // TODO: REMOVE ME, This method is not used in the test
    async approveTradableTokenTransferTo(toAddress: string, amount: string): Promise<void> {
        const registry = await ContractRegistry.getInstance();
        const connect = registry.tradableToken.connect(this.account);
        await connect.approve(toAddress, amount);        
    }

    public getAddress(): string {
        return this.account.address;
    }

    async borrow(amount: string, collateralAmount: string, days?:number): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.ibToken.setMockTimestamp(seconds);
        }
        const connect = registry.pool.connect(this.account);
        return await connect.borrow(amount, {value: collateralAmount});
    }

    async repayAll(amount: string, days?: number): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.debtToken.setMockTimestamp(seconds);
        }
        const connectToTradableToken = registry.tradableToken.connect(this.account);
        await connectToTradableToken.approve(registry.poolAddress, amount);
        const connect = registry.pool.connect(this.account);
        return await connect.repay();
    }

    public getInitialCollateralBalance(): BigInt {
        return this.initialNativeBalance!;
    }

    async getCollateralBalance(): Promise<BigInt> {
        return await this.account.provider.getBalance(this.account.getAddress());
    }


}