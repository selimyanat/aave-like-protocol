import { ethers } from "hardhat";
import { Pool, MockIBToken, MockDebtToken, LendingRate, BorrowingRate, OracleGateway, ProtocolReserve, CollateralToken, BorrowedToken} from "../../typechain-types";

const TRABLE_TOKEN_NAME = "Trable Token";
const TRABLE_TOKEN_SYMBOL = "TRB";
const TRADBALE_TOKEN_DECIMALS = 18
const TRADABLE_TOKEN_SUPPLY = ethers.parseUnits("1000000000", TRADBALE_TOKEN_DECIMALS);

const COLLATERAL_TOKEN_NAME = "Collateral Token";
const COLLATERAL_TOKEN_SYMBOL = "CLT";
const COLLATERAL_TOKEN_DECIMALS = 18
const COLLATERAL_TOKEN_SUPPLY = ethers.parseUnits("100000000", COLLATERAL_TOKEN_DECIMALS);

const IB_TOKEN_NAME = "Interest Bearing Token";
const IB_TOKEN_SYMBOL = "IBT";
const IB_TOKEN_INITIAL_EXCHANGE_RATE = ethers.parseUnits("1", TRADBALE_TOKEN_DECIMALS);
const ONE_DAY = 86400
const IB_TOKEN_INITIAL_ELAPSED_TIME = ONE_DAY;

const DEBT_TOKEN_NAME = "Debt Token";
const DEBT_TOKEN_SYMBOL = "DBT";
const DEBT_TOKEN_INITIAL_DEBT_INDEX = ethers.parseUnits("1", TRADBALE_TOKEN_DECIMALS);
const DEBT_TOKEN_INITIAL_ELAPSED_TIME = ONE_DAY
const LENDING_RATE_RESERVE_FACTOR = ethers.parseUnits("0.2", 18);

const BASE_BORROWING_RATE = ethers.parseUnits("0.08", 18);
const BORROWING_RATE_MULTIPLIER = ethers.parseUnits("0.1", 18);
const COLLATERAL_FACTOR = ethers.parseUnits("0.5", 18);
// Here we are assuming that the collateral value is equal to the borrowed amount like 1 borrowed token = 2000 collateral token (scaled to 18 decimals)
const COLLATERAL_PRICE =  ethers.parseUnits("2000", 18);
// 80% liquidation threshold
const LIQUIDATION_THRESHOLD = ethers.parseUnits("0.8", 18);
// 10% liquidation fee
const LIQUIDATION_PENALTY_RATE = ethers.parseUnits("0.10", 18);


export default class ContractRegistry {

    private static _instance: ContractRegistry | null = null; // Static instance for the singleton

    private _pool!: Pool;    
    private _borrowedToken!: BorrowedToken;
    private _ibToken!: MockIBToken;
    private _debtToken!: MockDebtToken;
    private _lendingRate!: LendingRate;
    private _borrowingRate!: BorrowingRate;
    private _oracleGateway!: OracleGateway;
    private _protocolReserve!: ProtocolReserve;
    private _collateralToken!: CollateralToken;

    private _poolAddress!: string;
    private _borrowedTokenAddress!: string;
    private _ibTokenAddress!: string;
    private _debtTokenAddress!: string;
    private _lendingRateAddress!: string;
    private _borrowingRateAddress!: string
    private _oracleGatewayAddress!: string;
    private _protocolReserveAddress!: string;
    private _collateralTokenAddress!: string;

    private constructor() {        
    }

    // Static method to get the singleton instance
    static async getInstance(): Promise<ContractRegistry> {
        if (!this._instance) {
            this._instance = new ContractRegistry();
            await this._instance.deployContracts();
        }
        return this._instance;
    }

    static async resetInstance(): Promise<void> {
        if (this._instance) {
            await this._instance.deployContracts();
        }
    }

    private async deployContracts(): Promise<void> {

        const [PoolFactory, BorrowedTokenFactory, MockIBTokenFactory, MockDebtTokenFactory, LendingRateFactory, BorrowingRateFactory, OracleGatewayFactory, ProtocolReserveFactory, CollateralTokenFactory] =
        await Promise.all([
          ethers.getContractFactory("Pool"),
          ethers.getContractFactory("BorrowedToken"),
          ethers.getContractFactory("MockIBToken"),
          ethers.getContractFactory("MockDebtToken"),
          ethers.getContractFactory("LendingRate"),
          ethers.getContractFactory("BorrowingRate"),
          ethers.getContractFactory("OracleGateway"),
          ethers.getContractFactory("ProtocolReserve"),
          ethers.getContractFactory("CollateralToken")
        ]);

        this._borrowedToken = await BorrowedTokenFactory.deploy(TRABLE_TOKEN_NAME, TRABLE_TOKEN_SYMBOL, TRADABLE_TOKEN_SUPPLY);        
        this._lendingRate = await LendingRateFactory.deploy(LENDING_RATE_RESERVE_FACTOR);
        this._borrowingRate = await BorrowingRateFactory.deploy(BASE_BORROWING_RATE, BORROWING_RATE_MULTIPLIER);
        this._oracleGateway = await OracleGatewayFactory.deploy(COLLATERAL_PRICE);
        this._collateralToken = await CollateralTokenFactory.deploy(COLLATERAL_TOKEN_NAME, COLLATERAL_TOKEN_SYMBOL, COLLATERAL_TOKEN_SUPPLY);       

        [this._borrowedTokenAddress, this._lendingRateAddress, this._borrowingRateAddress, this._oracleGatewayAddress, this._collateralTokenAddress] = await Promise.all([
            this._borrowedToken.getAddress(),
            this._lendingRate.getAddress(),
            this._borrowingRate.getAddress(),
            this._oracleGateway.getAddress(),
            this._collateralToken.getAddress()
        ])
        
        this._protocolReserve = await ProtocolReserveFactory.deploy(this._borrowedTokenAddress);
        this._protocolReserveAddress = await this._protocolReserve.getAddress();

        this._debtToken = await MockDebtTokenFactory.deploy(DEBT_TOKEN_NAME, DEBT_TOKEN_SYMBOL, DEBT_TOKEN_INITIAL_DEBT_INDEX, DEBT_TOKEN_INITIAL_ELAPSED_TIME, this._borrowingRateAddress);
        this._debtTokenAddress = await this._debtToken.getAddress();

        this._ibToken = await MockIBTokenFactory.deploy(IB_TOKEN_NAME, IB_TOKEN_SYMBOL, IB_TOKEN_INITIAL_EXCHANGE_RATE, this._lendingRateAddress, IB_TOKEN_INITIAL_ELAPSED_TIME);
        this._ibTokenAddress = await this._ibToken.getAddress()

        this._pool = await PoolFactory.deploy(
            this._borrowedTokenAddress, 
            this._collateralTokenAddress,
            this._ibTokenAddress, 
            this._lendingRateAddress, 
            this._borrowingRateAddress, 
            this._debtTokenAddress, 
            this._oracleGatewayAddress, 
            this._protocolReserveAddress,
            COLLATERAL_FACTOR,
            LIQUIDATION_THRESHOLD,
            LIQUIDATION_PENALTY_RATE);
        this._poolAddress = await this.pool.getAddress();
    }

    get pool(): Pool {
        return this._pool;
    }

    get borrowedToken(): BorrowedToken {
        return this._borrowedToken;
    }

    get ibToken(): MockIBToken {
        return this._ibToken;
    }

    get debtToken(): MockDebtToken {
        return this._debtToken;
    }

    get lendingRate(): LendingRate {
        return this._lendingRate;
    }

    get borrowingRate(): BorrowingRate {
        return this._borrowingRate;
    }

    get oracleGateway(): OracleGateway {
        return this._oracleGateway;
    }

    get protocolReserve(): ProtocolReserve {
        return this._protocolReserve;
    }

    get collateralToken(): CollateralToken {
        return this._collateralToken;
    }

    get poolAddress(): string {
        return this._poolAddress;
    }

    get borrowedTokenAddress(): string {
        return this._borrowedTokenAddress;
    }

    get ibTokenAddress(): string {
        return this._ibTokenAddress;
    }

    get debtTokenAddress(): string {
        return this._debtTokenAddress;
    }

    get lendingRateAddress(): string {
        return this._lendingRateAddress;
    }

    get oracleGatewayAddress(): string {
        return this._oracleGatewayAddress;
    }

    get protocolReserveAddress(): string {
        return this._protocolReserveAddress;
    }

    get collateralTokenAddress(): string {
        return this._collateralTokenAddress;
    }
}
