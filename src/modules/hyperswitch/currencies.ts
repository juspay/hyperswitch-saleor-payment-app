import { invariant } from "@/lib/invariant";
import { Money } from "generated/graphql";

export const getSaleorAmountFromHyperswitchAmount = (minor: number, currency: string) => {
    const decimals = getDecimalsForHyperswitch(currency);
    const multiplier = 10 ** decimals;
    return Number.parseFloat((minor / multiplier).toFixed(decimals));
  };

  export const getHyperswitchAmountFromSaleorMoney = (major: number, currency: string) => {
    const decimals = getDecimalsForHyperswitch(currency);
    const multiplier = 10 ** decimals;
    return Number.parseInt((major * multiplier).toFixed(0), 10);
  };

  const getDecimalsForHyperswitch = (currency: string): number => {
    if (currency.length !== 3) {
      throw new Error("currency needs to be a 3-letter code");
    }
  
    const hyperswitchDecimals = getHyperswitchCurrencies(currency.toUpperCase());
    const decimals = hyperswitchDecimals ?? 2;
    return decimals;
  };
  
  function getHyperswitchCurrencies(currency: string): number { 

    switch (currency) {
        case 'BIF':
        case 'CLP':
        case 'DJF':
        case 'GNF':
        case 'JPY':
        case 'KMF':
        case 'KRW':
        case 'MGA':
        case 'PYG':
        case 'RWF':
        case 'UGX':
        case 'VND':
        case 'VUV':
        case 'XAF':
        case 'XOF':
        case 'XPF':
              return 0;
        case 'BHD':
        case 'IQD':
        case 'JOD':
        case 'KWD':
        case 'LYD':
        case 'OMR':
        case 'TND':
        default:
            return 2;
    }
  }