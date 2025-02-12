import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ContractRegistry from "../contracts/ContractRegistry";
import { TransactionResponse } from "ethers";

export default class ProtocolAdmin {

    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<ProtocolAdmin> {
        return new ProtocolAdmin(account);
    }

    public getAddress(): string {
        return this.account.address;
    }

    async sendFundsFromReserve(toAddress: string, amount: string, ): Promise<TransactionResponse> {
        const registry = await ContractRegistry.getInstance();
        const connect = registry.protocolReserve.connect(this.account);
        return await connect.withdrawBorrowedToken(amount, toAddress);        
    }

}