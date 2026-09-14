'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import {
    StellarWalletsKit,
    WalletNetwork,
    type ISupportedWallet,
    FreighterModule,
    LobstrModule,
    AlbedoModule,
    xBullModule,
} from '@creit.tech/stellar-wallets-kit';

interface WalletContextType {
    isConnected: boolean;
    walletAddress: string | null;
    connectWallet: (onConnected?: () => void) => Promise<void>;
    disconnectWallet: () => void;
    signTransaction: (xdr: string) => Promise<string>;
    network: 'mainnet' | 'testnet';
    switchNetwork: (newNetwork: 'mainnet' | 'testnet') => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function networkToStellarNetwork(network: 'mainnet' | 'testnet'): WalletNetwork {
    return network === 'mainnet'
        ? WalletNetwork.PUBLIC
        : WalletNetwork.TESTNET;
}

let kit: StellarWalletsKit | null = null;

function getKit(network: 'mainnet' | 'testnet'): StellarWalletsKit {
    if (!kit) {
        kit = new StellarWalletsKit({
            network: networkToStellarNetwork(network),
            modules: [
                new FreighterModule(),
                new LobstrModule(),
                new AlbedoModule(),
                new xBullModule(),
            ],
        });
    }
    return kit;
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isConnectedState, setIsConnectedState] = useState(false);
    const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');
    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

    useEffect(() => {
        const checkConnection = async () => {
            if (localStorage.getItem('stellar_connected') !== 'true') return;

            try {
                const result = await getKit(network).getAddress();
                if (result?.address) {
                    setWalletAddress(result.address);
                    setIsConnectedState(true);
                }
            } catch {
                localStorage.removeItem('stellar_connected');
            }
        };

        checkConnection();
    }, [network]);

    const connectWallet = useCallback(async (onConnected?: () => void) => {
        try {
            await getKit(network).openModal({
                onWalletSelected: async (wallet: ISupportedWallet) => {
                    setSelectedWalletId(wallet.id);
                    getKit(network).setWallet(wallet.id);
                    const result = await getKit(network).getAddress();
                    setWalletAddress(result.address);
                    setIsConnectedState(true);
                    localStorage.setItem('stellar_connected', 'true');
                    if (onConnected) onConnected();
                },
            });
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    }, [network]);

    const disconnectWallet = useCallback(async () => {
        try {
            if (selectedWalletId) {
                await getKit(network).disconnect();
            }
            setWalletAddress(null);
            setIsConnectedState(false);
            setSelectedWalletId(null);
            localStorage.removeItem('stellar_connected');
        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
        }
    }, [selectedWalletId, network]);

    const signTransaction = useCallback(async (xdr: string): Promise<string> => {
        if (!selectedWalletId) throw new Error('No wallet connected');
        const result = await getKit(network).signTransaction(xdr, {
            networkPassphrase: networkToStellarNetwork(network),
        });
        return result.signedTxXdr;
    }, [selectedWalletId, network]);

    const switchNetwork = useCallback((newNetwork: 'mainnet' | 'testnet') => {
        setNetwork(newNetwork);
    }, []);

    const isConnected = isConnectedState || !!walletAddress;

    return (
        <WalletContext.Provider
            value={{ isConnected, walletAddress, connectWallet, disconnectWallet, signTransaction, network, switchNetwork }}
        >
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
