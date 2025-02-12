
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ContractRegistry from "../contracts/ContractRegistry";


export default class BorrowedTokensFaucet {

    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<BorrowedTokensFaucet> {
        return new BorrowedTokensFaucet(account);
    }

    async transferTokens(toAddress: string, amount: string): Promise<void> {
        const registry = await ContractRegistry.getInstance();
        const connect = registry.borrowedToken.connect(this.account);
        await connect.transfer(toAddress, amount);
    }

    public getAddress(): string {
        return this.account.address;
    }
}