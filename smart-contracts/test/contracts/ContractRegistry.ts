import { ethers } from "hardhat";
import { Pool, TradableToken, MockIBToken, MockDebtToken, LendingRate, BorrowingRate, OracleGateway, ProtocolReserve} from "../../typechain-types";


const TRABLE_TOKEN_NAME = "Trable Token";
const TRABLE_TOKEN_SYMBOL = "TRB";
const TRADBALE_TOKEN_DECIMALS = 18
const TRADABLE_TOKEN_SUPPLY = ethers.parseUnits("1000000000", TRADBALE_TOKEN_DECIMALS);

const IB_TOKEN_NAME = "Interest Bearing Token";
const IB_TOKEN_SYMBOL = "IBT";
const IB_TOKEN_INITIAL_EXCHANGE_RATE = ethers.parseUnits("1", TRADBALE_TOKEN_DECIMALS);
const ONE_DAY = 86400
const IB_TOKEN_INITIAL_ELAPSED_TIME = ONE_DAY;

const DEBT_TOKEN_NAME = "Debt Token";
const DEBT_TOKEN_SYMBOL = "DBT";
const DEBT_TOKEN_INITIAL_DEBT_INDEX = ethers.parseUnits("1.008", TRADBALE_TOKEN_DECIMALS);
const DEBT_TOKEN_INITIAL_ELAPSED_TIME = ONE_DAY

const LENDING_RATE_RESERVE_FACTOR = ethers.parseUnits("0.2", 18);

const BASE_BORROWING_RATE = ethers.parseUnits("0.08", 18);
const BORROWING_RATE_MULTIPLIER = ethers.parseUnits("0.1", 18);
const COLLATERAL_FACTOR = ethers.parseUnits("0.5", 18);
// Here we are assuming that the collateral value is equal to the borrowed amount like 1 ETH for 2000 Test token (scaled to 18 decimals)
const COLLATERAL_PRICE =  ethers.parseUnits("2000", 18);
// 80% liquidation threshold
const LIQUIDATION_THRESHOLD = ethers.parseUnits("0.8", 18);
// 10% liquidation fee
const LIQUIDATION_PENALTY_RATE = ethers.parseUnits("0.1", 18);


export default class ContractRegistry {

    private static _instance: ContractRegistry | null = null; // Static instance for the singleton

    private _pool!: Pool;    
    private _trableToken!: TradableToken;
    private _ibToken!: MockIBToken;
    private _debtToken!: MockDebtToken;
    private _lendingRate!: LendingRate;
    private _borrowingRate!: BorrowingRate;
    private _oracleGateway!: OracleGateway;
    private _protocolReserve!: ProtocolReserve;

    private _poolAddress!: string;
    private _trableTokenAddress!: string;
    private _ibTokenAddress!: string;
    private _debtTokenAddress!: string;
    private _lendingRateAddress!: string;
    private _borrowingRateAddress!: string
    private _oracleGatewayAddress!: string;
    private _protocolReserveAddress!: string;

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

        const [PoolFactory, TradableTokenFactory, MockIBTokenFactory, MockDebtTokenFactory, LendingRateFactory, BorrowingRateFactory, OracleGatewayFactory, ProtocolReserveFactory] =
        await Promise.all([
          ethers.getContractFactory("Pool"),
          ethers.getContractFactory("TradableToken"),
          ethers.getContractFactory("MockIBToken"),
          ethers.getContractFactory("MockDebtToken"),
          ethers.getContractFactory("LendingRate"),
          ethers.getContractFactory("BorrowingRate"),
          ethers.getContractFactory("OracleGateway"),
          ethers.getContractFactory("ProtocolReserve")
        ]);

        this._trableToken = await TradableTokenFactory.deploy(TRABLE_TOKEN_NAME, TRABLE_TOKEN_SYMBOL, TRADABLE_TOKEN_SUPPLY);
        this._ibToken = await MockIBTokenFactory.deploy(IB_TOKEN_NAME, IB_TOKEN_SYMBOL, IB_TOKEN_INITIAL_EXCHANGE_RATE, IB_TOKEN_INITIAL_ELAPSED_TIME);
        this._debtToken = await MockDebtTokenFactory.deploy(DEBT_TOKEN_NAME, DEBT_TOKEN_SYMBOL, DEBT_TOKEN_INITIAL_DEBT_INDEX, DEBT_TOKEN_INITIAL_ELAPSED_TIME);
        this._lendingRate = await LendingRateFactory.deploy(LENDING_RATE_RESERVE_FACTOR);
        this._borrowingRate = await BorrowingRateFactory.deploy(BASE_BORROWING_RATE, BORROWING_RATE_MULTIPLIER);
        this._oracleGateway = await OracleGatewayFactory.deploy(COLLATERAL_PRICE);        

        [this._trableTokenAddress, this._ibTokenAddress, this._debtTokenAddress, this._lendingRateAddress, this._borrowingRateAddress, this._oracleGatewayAddress] = await Promise.all([
            this._trableToken.getAddress(),
            this.ibToken.getAddress(),
            this._debtToken.getAddress(),
            this._lendingRate.getAddress(),
            this._borrowingRate.getAddress(),
            this._oracleGateway.getAddress()
        ])
        
        this._protocolReserve = await ProtocolReserveFactory.deploy(this._trableTokenAddress);
        this._protocolReserveAddress = await this._protocolReserve.getAddress();
        this._pool = await PoolFactory.deploy(
            this._trableTokenAddress, 
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

    get tradableToken(): TradableToken {
        return this._trableToken;
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

    get poolAddress(): string {
        return this._poolAddress;
    }

    get tradableTokenAddress(): string {
        return this._trableTokenAddress;
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
}
