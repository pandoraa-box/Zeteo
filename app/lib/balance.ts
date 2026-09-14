import { Horizon } from '@stellar/stellar-sdk';
import { getHorizonUrl, withRetry } from './contract';
import { Token, Network } from './tokens';

export async function fetchTokenBalances(
    accountAddress: string,
    tokens: Token[],
    network: Network
) {
    const server = new Horizon.Server(getHorizonUrl(network));

    const cgIds: Record<string, string> = {
        'XLM': 'stellar',
        'USDC': 'usd-coin',
        'BTC': 'wrapped-bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'DAI': 'dai',
        'WBTC': 'wrapped-bitcoin'
    };

    const ids = tokens.map(t => cgIds[t.symbol]).filter(Boolean).join(',');
    let prices: Record<string, { usd: number; usd_24h_change: number }> = {};

    if (ids) {
        try {
            const response = await fetch(`/api/prices?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
            if (response.ok) {
                prices = await response.json();
            }
        } catch (e) {
            console.error('Failed to fetch prices from price proxy:', e);
        }
    }

    let accountData: Horizon.AccountResponse | null = null;
    try {
        accountData = await withRetry(async () => {
            return await server.loadAccount(accountAddress);
        });
    } catch (error) {
        console.error('Failed to load account:', error);
    }

    const balancePromises = tokens.map(async (token) => {
        try {
            let balance = '0';

            if (token.isNative && accountData) {
                const nativeBalance = accountData.balances.find(
                    b => b.asset_type === 'native'
                );
                balance = nativeBalance ? nativeBalance.balance : '0';
            } else if (!token.isNative && accountData && token.issuer) {
                const tokenBalance = accountData.balances.find((b) => {
                    if (b.asset_type === 'native') return false;
                    return b.asset_type !== 'liquidity_pool_shares' &&
                        'asset_code' in b &&
                        b.asset_code === token.assetCode &&
                        'asset_issuer' in b &&
                        b.asset_issuer === token.issuer;
                });
                balance = tokenBalance ? tokenBalance.balance : '0';
            }

            const cgId = cgIds[token.symbol];
            const priceData = cgId ? prices[cgId] : null;

            return {
                ...token,
                balance,
                price: priceData?.usd || 0,
                change24h: priceData?.usd_24h_change || 0
            };
        } catch (error: unknown) {
            const errorMessage = (error as { message?: string })?.message || String(error);
            console.error(`Error fetching balance for ${token.symbol}:`, errorMessage);

            return {
                ...token,
                balance: '0',
                price: 0,
                change24h: 0
            };
        }
    });

    return Promise.all(balancePromises);
}
