# Zeteo

> The privacy-first Stellar dashboard for portfolio tracking, DEX swaps, and ZK-powered airdrop claims.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue?logo=stellar)](https://stellar.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Overview

Stellar users currently juggle fragmented tools for portfolio tracking, airdrop claims, and asset swapping. Zeteo unifies the entire lifecycle into a single, privacy-first dashboard powered by ZK-proofs, the Stellar DEX, and on-chain intelligence subscriptions.

## Features

- **Unified Portfolio** — Real-time tracking of XLM, USDC, and other Stellar assets across your wallets
- **Stellar DEX Swaps** — Swap assets directly on-chain with best-path routing and near-zero fees
- **ZK-Privacy Claims** — Claim airdrops anonymously using Soroban-powered zero-knowledge proofs
- **Airdrop Tracker** — Curated, real-time feed of the most valuable airdrops on Stellar
- **On-Chain Subscriptions** — Tiered plans (Basic, Standard, Premium) managed entirely via Soroban smart contracts
- **Multi-Wallet Support** — Connect with Freighter, Lobstr, Albedo, or xBull

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Smart Contracts | Rust / Soroban |
| Blockchain SDK | `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit` |
| Backend | Next.js API Routes, Redis (24h TTL) |
| Worker | Node.js background service for airdrop data sync |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Redis](https://redis.io/) (for caching)
- A Stellar wallet ([Freighter](https://freighter.app/), [Lobstr](https://lobstr.co/), or [Albedo](https://albedo.link/))

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/zeteo.git
cd zeteo

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start the dev server
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=<your-soroban-contract-id>
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

## Project Structure

```
zeteo/
├── app/
│   ├── components/       # Reusable React components
│   ├── context/          # Wallet context provider
│   ├── lib/              # Utilities (tokens, balances, contract)
│   ├── api/              # API routes (airdrop data, prices)
│   ├── docs/             # Documentation page
│   └── portfolio/        # Portfolio dashboard page
├── contracts/
│   └── src/              # Soroban smart contracts (Rust)
├── worker/               # Background worker for airdrop sync
├── public/               # Static assets
├── deploy.ts             # Contract deployment script
├── CONTRIBUTING.md       # Contribution guidelines
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check without emitting |

## Smart Contracts

The Soroban subscription contract lives in `contracts/src/`. It manages tiered subscriptions with additive upgrades.

```bash
# Build
stellar contract build

# Test
cargo test

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/zeteo.wasm \
  --source deployer \
  --network testnet
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- [Stellar Development Foundation](https://stellar.org/) for the Soroban platform
- [Freighter](https://freighter.app/) for the wallet SDK
- [Creit Technologies](https://creit.tech/) for the Stellar Wallets Kit
