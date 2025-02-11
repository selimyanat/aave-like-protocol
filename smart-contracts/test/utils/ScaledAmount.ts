import { ethers } from "ethers";

export default class ScaledAmount {

    private DECIMAL_18 = 18;

    private scaledAmount: string
    
    
    private constructor(value: string) {
        this.scaledAmount = ethers.parseUnits(value, this.DECIMAL_18).toString() 
    }

    static of(value: string): ScaledAmount {
        return new ScaledAmount(value)
    }

    public value(): string {
        return this.scaledAmount
    }
}

export const ZERO = ScaledAmount.of("0").value()
export const ONE = ScaledAmount.of("1").value();
export const MINUS_ONE = ScaledAmount.of("-1").value();
export const FIVE_HUNDRED = ScaledAmount.of("500").value();
export const ONE_THOUSAND = ScaledAmount.of("1000").value();
export const TWO_THOUSAND = ScaledAmount.of("2000").value();
export const ONE_HUNDRED_THOUSAND = ScaledAmount.of("100000").value();
export const TWO_HUNDRED_THOUSAND = ScaledAmount.of("200000").value();
export const THREE_HUNDRED_THOUSAND = ScaledAmount.of("300000").value();
export const FOUR_HUNDRED_THOUSAND = ScaledAmount.of("400000").value();