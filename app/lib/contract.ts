import { rpc, Horizon, Contract, xdr, Networks, nativeToScVal, scValToNative, TransactionBuilder, BASE_FEE, Address } from '@stellar/stellar-sdk';

export const getServerUrl = (network?: 'mainnet' | 'testnet') => {
    const net = network || process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
    if (net === 'mainnet') {
        return process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-rpc.mainnet.stellar.org';
    }
    return process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
};

export const getHorizonUrl = (network?: 'mainnet' | 'testnet') => {
    const net = network || process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
    if (net === 'mainnet') {
        return 'https://horizon.stellar.org';
    }
    return 'https://horizon-testnet.stellar.org';
};

function getSorobanServer(network?: 'mainnet' | 'testnet') {
    return new rpc.Server(getServerUrl(network));
}

function getHorizonServer(network?: 'mainnet' | 'testnet') {
    return new Horizon.Server(getHorizonUrl(network));
}

interface RpcError {
    code?: number;
    message?: string;
}

export const withRetry = async <T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> => {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: unknown) {
            const err = error as RpcError;
            lastError = error as Error;
            if (err?.code === 429 || err?.message?.includes('Too Many Requests')) {
                const delay = baseDelay * Math.pow(2, i);
                console.log(`Rate limited, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    throw lastError;
};

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

function getNetworkPassphrase(network?: 'mainnet' | 'testnet') {
    const net = network || process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
    return net === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

export async function subscribeToTier(address: string, tier: number): Promise<string> {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'mainnet' | 'testnet' | undefined;
    const sorobanServer = getSorobanServer(network);
    const horizonServer = getHorizonServer(network);

    const contract = new Contract(CONTRACT_ADDRESS);
    const account = await horizonServer.loadAccount(address);

    const txBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: getNetworkPassphrase(network),
    })
        .addOperation(
            contract.call(
                'subscribe',
                nativeToScVal(address, { type: 'address' }),
                nativeToScVal(tier, { type: 'u32' })
            )
        )
        .setTimeout(300);

    const tx = txBuilder.build();

    const simulated = await sorobanServer.simulateTransaction(tx);

    if ('error' in simulated) {
        throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const preparedTx = TransactionBuilder.fromXDR(
        (simulated as unknown as { tx: string }).tx,
        getNetworkPassphrase(network)
    );

    const result = await sorobanServer.sendTransaction(preparedTx);
    return result.hash;
}

export async function subscribeWithProof(address: string, tier: number, proof: number[]): Promise<string> {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'mainnet' | 'testnet' | undefined;
    const sorobanServer = getSorobanServer(network);
    const horizonServer = getHorizonServer(network);

    const contract = new Contract(CONTRACT_ADDRESS);
    const account = await horizonServer.loadAccount(address);

    const proofScVal = xdr.ScVal.scvVec(
        proof.map(p => xdr.ScVal.scvU32(p))
    );

    const txBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: getNetworkPassphrase(network),
    })
        .addOperation(
            contract.call(
                'subscribe_with_proof',
                nativeToScVal(address, { type: 'address' }),
                nativeToScVal(tier, { type: 'u32' }),
                proofScVal
            )
        )
        .setTimeout(300);

    const tx = txBuilder.build();

    const simulated = await sorobanServer.simulateTransaction(tx);

    if ('error' in simulated) {
        throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const preparedTx = TransactionBuilder.fromXDR(
        (simulated as unknown as { tx: string }).tx,
        getNetworkPassphrase(network)
    );

    const result = await sorobanServer.sendTransaction(preparedTx);
    return result.hash;
}

export async function getSubscription(userAddress: string): Promise<{ expiry: number; tier: number }> {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'mainnet' | 'testnet' | undefined;
    const sorobanServer = getSorobanServer(network);
    const horizonServer = getHorizonServer(network);

    try {
        const contract = new Contract(CONTRACT_ADDRESS);
        const account = await horizonServer.loadAccount(userAddress);

        const tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: getNetworkPassphrase(network),
        })
            .addOperation(
                contract.call(
                    'get_subscription',
                    nativeToScVal(userAddress, { type: 'address' })
                )
            )
            .setTimeout(300)
            .build();

        const result = await withRetry(async () => {
            return await sorobanServer.simulateTransaction(tx);
        });

        if ('result' in result && result.result) {
            const ScVal = result.result.retval;
            const native = scValToNative(ScVal) as { expiry: bigint; tier: number };
            return {
                expiry: Number(native.expiry),
                tier: native.tier,
            };
        }

        return { expiry: 0, tier: 0 };
    } catch (error) {
        console.error('Get subscription error:', error);
        return { expiry: 0, tier: 0 };
    }
}
