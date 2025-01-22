import hre, { ethers } from "hardhat";
import ContractRegistry from "../contracts/ContractRegistry";


export default class BlockchainUtils {

    static async saveState(): Promise<string> {
        return await ethers.provider.send("evm_snapshot", []);
    }

    static async rollbackStateTo(blockchainStateId: string): Promise<void> {
        //return await ethers.provider.send("evm_revert", [blockchainStateId]);
        await ethers.provider.send("hardhat_reset", []);
    }

    static async addDays(regisry: ContractRegistry, days: number): Promise<void> {
        /*        
        const seconds = days * 24 * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [seconds]);
        await ethers.provider.send("evm_mine", []); */
        const seconds = days * 24 * 60 * 60;
        await regisry.ibToken.setMockTimestamp(seconds);
        await regisry.debtToken.setMockTimestamp(seconds);
        /*
        const currentBlock = await ethers.provider.getBlock("latest");
        console.log("DEBUG: currentBlock", currentBlock?.number, currentBlock?.timestamp);
        const newTimestamp = currentBlock!.timestamp  + seconds
        await ethers.provider.send("evm_setNextBlockTimestamp", [newTimestamp]);
        await ethers.provider.send("evm_mine", []);*/
    }
}