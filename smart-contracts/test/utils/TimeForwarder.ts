import ContractRegistry from "../contracts/ContractRegistry";


export default class TimeForwarder {

    private static _instance: TimeForwarder | null = null; // Static instance for the singleton

    private constructor() {}


    static getInstance(): TimeForwarder {

        if (!this._instance) {
            this._instance = new TimeForwarder();
        }
        return this._instance
    }

    async forwardTime(days: number): Promise<void> {
        // We don't mess with the blockchain time in the tests
        const registry = await ContractRegistry.getInstance();
        const seconds = days * 24 * 60 * 60;
        await registry.ibToken.setMockTimestamp(seconds);
        await registry.debtToken.setMockTimestamp(seconds);
    }


}