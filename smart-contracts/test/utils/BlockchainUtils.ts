import hre, { ethers } from "hardhat";
import ContractRegistry from "../contracts/ContractRegistry";


export default class BlockchainUtils {

    static async saveState(): Promise<string> {
        return await ethers.provider.send("evm_snapshot", []);
    }

    static async rollbackStateTo(blockchainStateId: string): Promise<void> {
        await ethers.provider.send("hardhat_reset", []);
    }
}