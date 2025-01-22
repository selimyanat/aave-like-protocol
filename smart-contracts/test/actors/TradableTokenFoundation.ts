
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ContractRegistry from "../contracts/ContractRegistry";


export default class TradableTokenFoundation {

    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<TradableTokenFoundation> {
        return new TradableTokenFoundation(account);
    }

    async airDrop(toAddress: string, amount: string): Promise<void> {
        const registry = await ContractRegistry.getInstance();
        const connect = registry.tradableToken.connect(this.account);
        await connect.transfer(toAddress, amount);
    }

    public getAddress(): string {
        return this.account.address;
    }
}