'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown, ArrowRight, Wallet, Zap } from 'lucide-react';
import { useWallet } from '@/app/context/WalletContext';
import { TOKENS, type Token, type Network } from '@/app/lib/tokens';
import { getHorizonUrl } from '@/app/lib/contract';
import {
    Asset,
    Horizon,
    Operation,
    TransactionBuilder,
    BASE_FEE,
    Networks,
} from '@stellar/stellar-sdk';
import { StatusModal, type StatusStep } from './StatusModal';

const SWAP_STEPS: StatusStep[] = [
    { id: 'building', label: 'Building Transaction' },
    { id: 'signing', label: 'Awaiting Wallet Signature' },
    { id: 'submitting', label: 'Submitting to Stellar' },
    { id: 'confirming', label: 'Confirming on Network' },
];

function tokenToAsset(token: Token): Asset {
    if (token.isNative) return Asset.native();
    return new Asset(token.assetCode, token.issuer!);
}

function getHorizonServer(network: Network) {
    return new Horizon.Server(getHorizonUrl(network));
}

export default function StellarSwap() {
    const { walletAddress, isConnected, signTransaction, network } = useWallet();

    const tokens = TOKENS[network] || [];
    const [fromToken, setFromToken] = useState<Token | null>(tokens[0] || null);
    const [toToken, setToToken] = useState<Token | null>(tokens[1] || null);
    const [amount, setAmount] = useState('');
    const [estimatedReceive, setEstimatedReceive] = useState('');
    const [exchangeRate, setExchangeRate] = useState('');
    const [priceImpact, setPriceImpact] = useState('');
    const [isFetchingRate, setIsFetchingRate] = useState(false);

    const [demoStatus, setDemoStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [currentStepId, setCurrentStepId] = useState('building');
    const [txHash, setTxHash] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (tokens.length > 0) {
            setFromToken(tokens[0]);
            setToToken(tokens.length > 1 ? tokens[1] : tokens[0]);
        }
    }, [network]);

    const fetchRate = useCallback(async () => {
        if (!fromToken || !toToken || !amount || parseFloat(amount) <= 0) {
            setEstimatedReceive('');
            setExchangeRate('');
            setPriceImpact('');
            return;
        }

        setIsFetchingRate(true);
        try {
            const horizon = getHorizonServer(network);
            const sellAsset = tokenToAsset(fromToken);
            const buyAsset = tokenToAsset(toToken);

            const paths = await horizon
                .strictReceivePaths([sellAsset], buyAsset, amount)
                .limit(1)
                .call();

            if (paths.records.length > 0) {
                const bestPath = paths.records[0];
                const receive = parseFloat(bestPath.destination_amount);
                const send = parseFloat(bestPath.source_amount);
                const rate = receive / send;

                setEstimatedReceive(receive.toFixed(7));
                setExchangeRate(`1 ${fromToken.symbol} ≈ ${rate.toFixed(6)} ${toToken.symbol}`);

                const slippage = ((send - parseFloat(amount)) / parseFloat(amount)) * 100;
                setPriceImpact(slippage > 0.5 ? `${slippage.toFixed(2)}%` : '');
            } else {
                setEstimatedReceive('No path found');
                setExchangeRate('');
                setPriceImpact('');
            }
        } catch (error) {
            console.error('Failed to fetch rate:', error);
            setEstimatedReceive('Error');
            setExchangeRate('');
        } finally {
            setIsFetchingRate(false);
        }
    }, [fromToken, toToken, amount, network]);

    useEffect(() => {
        const debounce = setTimeout(fetchRate, 500);
        return () => clearTimeout(debounce);
    }, [fetchRate]);

    const handleSwapTokens = () => {
        setFromToken(toToken);
        setToToken(fromToken);
        setAmount('');
        setEstimatedReceive('');
    };

    const handleSwap = async () => {
        if (!fromToken || !toToken || !amount || !walletAddress) return;

        setDemoStatus('processing');
        setCurrentStepId('building');
        setErrorMessage('');

        try {
            const horizon = getHorizonServer(network);
            const account = await horizon.loadAccount(walletAddress);
            const sellAsset = tokenToAsset(fromToken);
            const buyAsset = tokenToAsset(toToken);

            const paths = await horizon
                .strictReceivePaths([sellAsset], buyAsset, amount)
                .limit(1)
                .call();

            if (paths.records.length === 0) {
                throw new Error('No swap path available for this pair');
            }

            const bestPath = paths.records[0];
            const pathAssets = bestPath.path.map(
                (p) => new Asset(p.asset_code, p.asset_issuer)
            );

            const txBuilder = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase:
                    network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
            });

            txBuilder.addOperation(
                Operation.pathPaymentStrictReceive({
                    sendAsset: sellAsset,
                    sendMax: bestPath.source_amount,
                    destination: walletAddress,
                    destAsset: buyAsset,
                    destAmount: amount,
                    path: pathAssets,
                })
            );

            const tx = txBuilder.setTimeout(300).build();

            setCurrentStepId('signing');
            const signedXdr = await signTransaction(tx.toXDR());

            setCurrentStepId('submitting');
            const signedTx = TransactionBuilder.fromXDR(
                signedXdr,
                network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
            );

            const result = await horizon.submitTransaction(signedTx);

            setCurrentStepId('confirming');
            setTxHash(result.hash);
            setDemoStatus('success');
            setAmount('');
            setEstimatedReceive('');
        } catch (error: unknown) {
            console.error('Swap failed:', error);
            const msg = error instanceof Error ? error.message : 'Swap failed';
            setErrorMessage(msg);
            setDemoStatus('error');
        }
    };

    const getButtonLabel = () => {
        if (demoStatus === 'processing') return 'Swapping...';
        if (!amount || parseFloat(amount) <= 0) return 'Enter amount';
        if (isFetchingRate) return 'Fetching rate...';
        return 'Swap';
    };

    return (
        <div className="p-8 rounded-3xl bg-linear-to-br from-cyan-500/10 via-transparent to-purple-500/10 border border-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <Zap className="text-white w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Stellar DEX Swap</h2>
                            <p className="text-gray-500 text-xs">Powered by the Stellar Decentralized Exchange</p>
                        </div>
                    </div>

                    {!isConnected ? (
                        <div className="bg-linear-to-b from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-3xl p-8 text-center backdrop-blur-md group shadow-2xl">
                            <div className="w-16 h-16 bg-black/50 border border-cyan-500/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                <Wallet className="w-8 h-8 text-cyan-400" />
                            </div>
                            <h3 className="text-xl text-white font-bold mb-2 tracking-tight">Connect Wallet</h3>
                            <p className="text-gray-400 text-sm">Connect your Stellar wallet to start swapping</p>
                        </div>
                    ) : (
                        <div className="bg-black/60 p-4 rounded-3xl border border-white/10 flex flex-col gap-4 shadow-2xl">
                            {/* From Token */}
                            <div className="flex items-center px-2 py-1">
                                <div className="flex-1 flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 px-1">You Pay</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={fromToken?.id || ''}
                                            onChange={(e) => {
                                                const selected = tokens.find(t => t.id === e.target.value);
                                                if (selected) setFromToken(selected);
                                            }}
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                                        >
                                            {tokens.map(t => (
                                                <option key={t.id} value={t.id} className="bg-black text-white">{t.symbol}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="bg-transparent text-4xl font-bold text-white outline-none w-full placeholder:text-gray-700 font-mono min-w-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Swap Direction Button */}
                            <div className="flex justify-center -my-1">
                                <button
                                    onClick={handleSwapTokens}
                                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                                >
                                    <ArrowUpDown className="w-4 h-4 text-cyan-400" />
                                </button>
                            </div>

                            {/* To Token */}
                            <div className="flex items-center px-2 py-1">
                                <div className="flex-1 flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 px-1">You Receive</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={toToken?.id || ''}
                                            onChange={(e) => {
                                                const selected = tokens.find(t => t.id === e.target.value);
                                                if (selected) setToToken(selected);
                                            }}
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                                        >
                                            {tokens.map(t => (
                                                <option key={t.id} value={t.id} className="bg-black text-white">{t.symbol}</option>
                                            ))}
                                        </select>
                                        <div className="text-4xl font-bold text-white font-mono min-w-0 truncate">
                                            {isFetchingRate ? (
                                                <span className="text-gray-600 text-2xl">...</span>
                                            ) : estimatedReceive ? (
                                                estimatedReceive
                                            ) : (
                                                <span className="text-gray-700">0.00</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rate Info */}
                            {(exchangeRate || priceImpact) && (
                                <div className="flex justify-between items-center text-xs pt-3 border-t border-white/5 px-2">
                                    <span className="text-gray-500 font-mono">{exchangeRate}</span>
                                    {priceImpact && (
                                        <span className="text-yellow-500 font-mono">Price impact: {priceImpact}</span>
                                    )}
                                </div>
                            )}

                            {/* Swap Button */}
                            <button
                                onClick={handleSwap}
                                disabled={!amount || parseFloat(amount) <= 0 || isFetchingRate || demoStatus === 'processing'}
                                className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-white/5 disabled:text-gray-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                            >
                                {getButtonLabel()} <ArrowRight size={18} />
                            </button>

                            {/* Connected Address */}
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Panel */}
                <div className="w-full md:w-80 p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg">How It Works</h3>
                    <div className="space-y-6">
                        {[
                            { step: '1', title: 'Select Assets', desc: 'Choose which Stellar tokens to swap' },
                            { step: '2', title: 'DEX Routing', desc: 'Find the best path across the Stellar orderbook' },
                            { step: '3', title: 'Instant Settlement', desc: 'Transaction settles in ~5 seconds on Stellar' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-cyan-500 shrink-0 border border-cyan-500/30">{item.step}</div>
                                <div>
                                    <div className="text-white text-sm font-bold">{item.title}</div>
                                    <div className="text-gray-500 text-xs mt-1">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <StatusModal
                isOpen={demoStatus !== 'idle'}
                onClose={() => { setDemoStatus('idle'); setErrorMessage(''); }}
                status={demoStatus === 'error' ? 'error' : demoStatus}
                title={demoStatus === 'error' ? 'Swap Failed' : 'Swapping on Stellar DEX'}
                step={SWAP_STEPS.find(s => s.id === currentStepId)?.label}
                steps={SWAP_STEPS}
                currentStepId={currentStepId}
                txHash={txHash}
                txLabel="Stellar Transaction Hash"
                successMessage={`Successfully swapped ${fromToken?.symbol} for ${toToken?.symbol}. Your assets have been updated.`}
                Icon={Zap}
                iconColor="text-cyan-400"
            />
        </div>
    );
}
