import hre, { ethers } from "hardhat";
import Borrower from "./Borrower";
import Lender from "./Lender";
import Liquidator from "./Liquidator";
import ProtocolAdmin from "./ProtocolAdmin";
import TradableTokenFoundation from "./TradableTokenFoundation";


export default class TestActorsRegistry {

    private static _instance: TestActorsRegistry | null = null; // Static instance for the singleton

    private _charlesTheProtocolAdmin!: ProtocolAdmin;
    private _aliceTheLender!: Lender;
    private _vitoTheLender!: Lender;  
    private _bobTheBorrower!: Borrower;
    private _gregTheLiquidator!: Liquidator;
    private _tradableTokenFoundation!: TradableTokenFoundation;

    private constructor() {}


    static async getInstance(): Promise<TestActorsRegistry> {

        if (!this._instance) {
            this._instance = new TestActorsRegistry();
            await this._instance.createInitialAcccounts();
        }
        return this._instance
    }

    static async resetInstance(): Promise<void> {
        if (this._instance) {
            await this._instance.createInitialAcccounts();
        }
    }

    private async createInitialAcccounts(): Promise<void> {
        const accounts = await ethers.getSigners();        
        this._charlesTheProtocolAdmin = await ProtocolAdmin.newInstance(accounts[0]);
        // because address[0] is the contract owner
        this._tradableTokenFoundation = await TradableTokenFoundation.newInstance(accounts[0]);
        this._aliceTheLender = await Lender.newInstance(accounts[1]);
        this._vitoTheLender = await Lender.newInstance(accounts[2]);
        this._bobTheBorrower = await Borrower.newInstance(accounts[3]);
        this._gregTheLiquidator = await Liquidator.newInstance(accounts[4]);         
    }

    get charlesTheProtocolAdmin(): ProtocolAdmin {
        return this._charlesTheProtocolAdmin;
    }

    get aliceTheLender(): Lender {
        return this._aliceTheLender;
    }

    get bobTheBorrower(): Borrower {
        return this._bobTheBorrower;
    }

    get gregTheLiquidator(): Liquidator {
        return this._gregTheLiquidator;
    }

    get vitoTheLender(): Lender {
        return this._vitoTheLender;
    }

    get tradableTokenFoundation(): TradableTokenFoundation {
        return this._tradableTokenFoundation;
    }
}
