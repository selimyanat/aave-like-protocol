import { ethers } from "hardhat";
import ContractRegistry from "../contracts/ContractRegistry";


export default class TimeForwarder {

    private static SECOND  : number = 1000;

    // Static instance for the singleton
    private static _instance: TimeForwarder | null = null; 

    private currentMockTimestamp: number;


    private constructor() {
        this.currentMockTimestamp = 0;
    }

    static getInstance(): TimeForwarder {

        if (!this._instance) {
            this._instance = new TimeForwarder();
        }
        return this._instance
    }

    static async resetInstance(): Promise<void> {
        this._instance = null;
    }


    async forwardTime(days: number): Promise<void> {
        // We don't mess with the blockchain time in the tests
        const registry = await ContractRegistry.getInstance();
        const seconds = days * 24 * 60 * 60;

        // Calculate the new mock timestamp
        this.currentMockTimestamp += seconds;
    
        await registry.ibToken.setMockTimestamp(this.currentMockTimestamp);
        await registry.debtToken.setMockTimestamp(this.currentMockTimestamp);
    }


}