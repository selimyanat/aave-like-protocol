
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import ContractRegistry from "../contracts/ContractRegistry";
import { CollateralToken__factory } from "../../typechain-types";


export default class CollateralTokenFaucet {

    private account: HardhatEthersSigner;

    private constructor(account: HardhatEthersSigner) {
        this.account = account;
    }

    static async newInstance(account: HardhatEthersSigner): Promise<CollateralTokenFaucet> {
        return new CollateralTokenFaucet(account);
    }

    async transferTokens(toAddress: string, amount: string): Promise<void> {
        const registry = await ContractRegistry.getInstance();
        const connect = registry.collateralToken.connect(this.account);
        await connect.transfer(toAddress, amount);
    }

    public getAddress(): string {
        return this.account.address;
    }
}