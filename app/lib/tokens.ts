export interface Token {
    id: string;
    name: string;
    symbol: string;
    assetCode: string;
    issuer?: string;
    isNative: boolean;
    decimals: number;
    icon: string;
}

export type Network = 'mainnet' | 'testnet';

export const TOKENS: Record<Network, Token[]> = {
    mainnet: [
        {
            id: 'xlm-mainnet',
            name: 'Stellar Lumens',
            symbol: 'XLM',
            assetCode: 'XLM',
            isNative: true,
            decimals: 7,
            icon: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png'
        },
        {
            id: 'usdc-mainnet',
            name: 'USD Coin',
            symbol: 'USDC',
            assetCode: 'USDC',
            issuer: 'GA5ZSEJYB37JDD5G4LYXOCMILURGASESMQKAZOY5A6LNV2NTQJHFXFZ',
            isNative: false,
            decimals: 7,
            icon: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png'
        },
        {
            id: 'btc-mainnet',
            name: 'Wrapped Bitcoin ( Stellar )',
            symbol: 'BTC',
            assetCode: 'BTC',
            issuer: 'GATEMHCJHE6OLDZHO57QYKWQMW5VKY46FKFO2YYAY6HLEL72K4QPATYX',
            isNative: false,
            decimals: 7,
            icon: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png'
        },
        {
            id: 'eth-mainnet',
            name: 'Wrapped Ethereum',
            symbol: 'ETH',
            assetCode: 'ETH',
            issuer: 'GBVOLZ7ARPAS7UQVLD44FDM45SVGO6N2AYSC3AY5NRMI5PYQYGN2DPZ',
            isNative: false,
            decimals: 7,
            icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
        }
    ],
    testnet: [
        {
            id: 'xlm-testnet',
            name: 'Stellar Lumens',
            symbol: 'XLM',
            assetCode: 'XLM',
            isNative: true,
            decimals: 7,
            icon: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png'
        },
        {
            id: 'usdc-testnet',
            name: 'USD Coin',
            symbol: 'USDC',
            assetCode: 'USDC',
            issuer: 'GAZMO3BYK64JWUQXCWQK3RMTO2TGSNV6V7SIOIV2UJQOJR4BBY7STU6Z',
            isNative: false,
            decimals: 7,
            icon: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png'
        }
    ]
};
