import { ethers } from "hardhat";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DECIMAL_18 = 18;
export const ZERO = ethers.parseUnits("0", DECIMAL_18);
export const ONE = ethers.parseUnits("1", DECIMAL_18);
export const MINUS_ONE = ethers.parseUnits("-1", DECIMAL_18);
export const FIVE_HUNDRED = ethers.parseUnits("500", DECIMAL_18);
export const ONE_HUNDRED_THOUSAND = ethers.parseUnits("100000", DECIMAL_18);
export const TWO_HUNDRED_THOUSAND = ethers.parseUnits("200000", DECIMAL_18);
export const THREE_HUNDRED_THOUSAND = ethers.parseUnits("300000", DECIMAL_18);
export const FOUR_HUNDRED_THOUSAND = ethers.parseUnits("400000", DECIMAL_18);
export const ONE_THOUSAND = ethers.parseUnits("1000", DECIMAL_18);
export const TWO_THOUSAND = ethers.parseUnits("2000", DECIMAL_18);

export const ONE_DAY = 1;
export const ONE_YEAR = 365;
