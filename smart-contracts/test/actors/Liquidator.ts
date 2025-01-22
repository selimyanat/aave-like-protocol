import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ContractRegistry from "../contracts/ContractRegistry";
import { TransactionResponse } from "ethers";

export default class Liquidator {

    private initialNativeBalance?: BigInt;
    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<Liquidator> {
        const liquidator = new Liquidator(account);
        liquidator.initialNativeBalance = await liquidator.account.provider.getBalance(account.getAddress());
        return liquidator;
    }

    async getTradableTokenBalance(): Promise<BigInt> {
        const registry = await ContractRegistry.getInstance();
        return await registry.tradableToken.balanceOf(this.account.getAddress());
    }

    async liquidate(borrower: string, amount: string, days?: number): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        // simulate time passing to update the interest rate
        if (days !== undefined) {
            const seconds = days * 24 * 60 * 60;
            await registry.ibToken.setMockTimestamp(seconds);
            await registry.ibToken.setMockTimestamp(seconds);
        }
        const connectToTradableToken = registry.tradableToken.connect(this.account);
        await connectToTradableToken.approve(registry.poolAddress, amount);
        const connect = registry.pool.connect(this.account);
        return await connect.liquidate(borrower);
    }
    
    public getAddress(): string {
        return this.account.address;
    }

    public getInitialCollateralBalance(): BigInt {
        return this.initialNativeBalance!;
    }

    async getCollateralBalance(): Promise<BigInt> {
        return await this.account.provider.getBalance(this.account.getAddress());
    }
}