import 'dotenv/config';
import { Horizon } from '@stellar/stellar-sdk';
import { createClient } from 'redis';

// Configuration
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Domain Allowlist
const ALLOWED_DOMAINS = [
    'stellar.org',
    'lobstr.co',
    'albedo.link',
    'xbull.app',
    'rabet.app',
    'defillama.com'
];

// Mock Airdrop Data (Kept for demonstration)
const MOCK_AIRDROPS = [
    {
        name: 'Zeteo Milestone #1',
        url: 'https://stellar.org/claim',
        amount: '1000 ZET',
        status: 'Claimable'
    },
    {
        name: 'Early Supporter Drop',
        url: 'https://stellar.org/claim',
        amount: '500 ZET',
        status: 'Pending'
    }
];

// Fetch live airdrops from DefiLlama
async function fetchLiveAirdrops() {
    try {
        console.log('Fetching live airdrops from DefiLlama...');
        const response = await fetch('https://api.llama.fi/airdrops');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        return (data || []).slice(0, 50).map(drop => ({
            name: drop.project || 'Unknown Project',
            url: drop.link || 'https://defillama.com/airdrops',
            amount: 'Check eligibility',
            status: drop.status === 'active' ? 'Claimable' : 'Potential',
            expiry: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
        }));
    } catch (error) {
        console.error('Failed to fetch live airdrops:', error);
        return [];
    }
}

async function main() {
    console.log('Starting Zeteo Worker...');

    // 1. Redis Setup
    const redisClient = createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
            console.error('Error: Redis is not running. Please start Redis server (e.g., redis-server).');
            process.exit(1);
        } else {
            console.error('Redis Client Error', err);
        }
    });

    try {
        await redisClient.connect();
        console.log('Connected to Redis');
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error('Failed to connect to Redis. Is the server running?');
            process.exit(1);
        }
        throw err;
    }

    // 2. Stellar Horizon Setup
    const server = new Horizon.Server(HORIZON_URL);

    console.log(`Listening for operations on contract: ${CONTRACT_ADDRESS}`);

    // Poll for transactions related to the contract
    let lastLedger = 0;

    try {
        const root = await server.root();
        lastLedger = parseInt(root.history_latest_ledger);
        console.log(`Starting from ledger ${lastLedger}`);
    } catch (error) {
        console.error('Failed to connect to Horizon:', error);
        process.exit(1);
    }

    setInterval(async () => {
        try {
            const root = await server.root();
            const currentLedger = parseInt(root.history_latest_ledger);

            if (currentLedger > lastLedger) {
                console.log(`Checking ledgers ${lastLedger + 1} to ${currentLedger}...`);

                // Search for operations on the contract account
                const operations = await server
                    .operations()
                    .forAccount(CONTRACT_ADDRESS)
                    .cursor(lastLedger.toString())
                    .limit(100)
                    .call();

                for (const op of operations.records) {
                    if (op.type === 'invoke_host_function' && 'transaction_hash' in op) {
                        await processOperation(op, redisClient);
                    }
                }

                lastLedger = currentLedger;
            }
        } catch (error) {
            console.error('Error polling ledgers:', error);
        }
    }, 10000);
}

async function processOperation(op, redis) {
    console.log('Detected contract operation:', op.id);

    // In a real implementation, we would decode the Soroban contract event data
    // For now, we'll use mock data processing
    const userAddress = op.source_account || 'unknown';
    const tier = 1;
    const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

    console.log(`Processing subscription for ${userAddress} (Tier ${tier})`);

    // 1. Filter Mock Airdrops
    const eligibleMockAirdrops = MOCK_AIRDROPS.filter(drop => {
        try {
            const domain = new URL(drop.url).hostname;
            return ALLOWED_DOMAINS.some(allowed => domain === allowed || domain.endsWith('.' + allowed));
        } catch { return false; }
    });

    const now = Math.floor(Date.now() / 1000);
    const mockWithExpiry = eligibleMockAirdrops.map(drop => ({
        ...drop,
        expiry: drop.expiry || (now + 30 * 24 * 60 * 60)
    }));

    // 2. Fetch and merge live airdrops with Tier-based limits
    const maxLive = tier === 1 ? 0 : (tier === 2 ? 5 : 20);
    let filteredLive = [];

    if (maxLive > 0) {
        const liveAirdrops = await fetchLiveAirdrops();
        filteredLive = liveAirdrops.filter(drop => {
            try {
                const domain = new URL(drop.url).hostname;
                return ALLOWED_DOMAINS.some(allowed => domain === allowed || domain.endsWith('.' + allowed));
            } catch { return false; }
        }).slice(0, maxLive);
    }

    const combinedAirdrops = [...mockWithExpiry, ...filteredLive];

    const userData = {
        status: 'active_subscription',
        tier: tier,
        expiry: expiry,
        airdrops: combinedAirdrops,
        last_updated: now
    };

    // 3. Write to Redis
    const key = `user:${userAddress}:data`;
    await redis.set(key, JSON.stringify(userData), {
        EX: 24 * 60 * 60
    });

    console.log(`Data written to Redis for ${userAddress} with ${combinedAirdrops.length} airdrops`);
}

main().catch(console.error);
