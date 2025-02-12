import hre, { ethers } from "hardhat";
import Borrower from "./Borrower";
import Lender from "./Lender";
import Liquidator from "./Liquidator";
import ProtocolAdmin from "./ProtocolAdmin";
import BorrowedTokensFaucet from "./BorrowedTokenFaucet";
import CollateralTokenFaucet from "./CollateralTokenFaucet";


export default class TestActorsRegistry {

    private static _instance: TestActorsRegistry | null = null; // Static instance for the singleton

    private _charlesTheProtocolAdmin!: ProtocolAdmin;
    private _aliceTheLender!: Lender;
    private _vitoTheLender!: Lender;  
    private _bobTheBorrower!: Borrower;
    private _gregTheLiquidator!: Liquidator;
    private _borrowedTokenFaucet!: BorrowedTokensFaucet;
    private _collateralTokenFaucet!: CollateralTokenFaucet

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
        // because address[0] is the contract owner / deployer. In real life scenario this would be
        // different accounts
        this._charlesTheProtocolAdmin = await ProtocolAdmin.newInstance(accounts[0]);
        this._borrowedTokenFaucet = await BorrowedTokensFaucet.newInstance(accounts[0]);
        this._collateralTokenFaucet = await CollateralTokenFaucet.newInstance(accounts[0]);

        // set up the other actors with their accounts
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

    get borrowedTokenFaucet(): BorrowedTokensFaucet {
        return this._borrowedTokenFaucet;
    }

    get collateralTokenFaucet(): CollateralTokenFaucet {
        return this._collateralTokenFaucet;
    }
}
