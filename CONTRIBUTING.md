# Contributing to Zeteo

Thanks for your interest in contributing to Zeteo! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Rust](https://rustup.rs/) (for Soroban smart contracts)
- [Stellar CLI](https://soroban.stellar.org/docs/getting-started/setup) (for contract deployment)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/zeteo.git
cd zeteo

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
zeteo/
├── app/                  # Next.js app directory
│   ├── components/       # React components
│   ├── context/          # Wallet context provider
│   ├── lib/              # Utilities (tokens, balances, contract)
│   ├── api/              # API routes
│   ├── docs/             # Documentation page
│   └── portfolio/        # Portfolio dashboard
├── contracts/            # Soroban smart contracts (Rust)
├── worker/               # Background worker for airdrop tracking
├── public/               # Static assets
└── deploy.ts             # Contract deployment script
```

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Styling:** Tailwind CSS 4, Framer Motion
- **Blockchain:** Stellar (Soroban for smart contracts)
- **Wallet:** `@creit.tech/stellar-wallets-kit`
- **SDK:** `@stellar/stellar-sdk`
- **Language:** TypeScript, Rust (contracts)

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run the linter and type checker
4. Submit a pull request

```bash
# Lint
pnpm lint

# Type check
npx tsc --noEmit
```

## Code Style

- Use TypeScript for all new code
- Follow the existing component patterns (functional components, hooks)
- Use `clsx` for conditional classes
- Keep components in `app/components/` unless they are page-specific
- Use the `useWallet()` hook for wallet interactions
- Prefer `@stellar/stellar-sdk` utilities over manual XDR construction

## Smart Contracts

Contracts are written in Rust using the Soroban SDK. They live in `contracts/src/`.

```bash
# Build contracts
stellar contract build

# Run tests
cargo test

# Deploy to testnet
stellar network add --global testnet --rpc-url https://soroban-testnet.stellar.org --passphrase "Test SDF Network ; September 2015"
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/zeteo.wasm --source deployer --network testnet
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=<your-deployed-contract>
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

## Submitting Changes

- Keep PRs focused on a single feature or fix
- Write clear commit messages
- Ensure `pnpm lint` and `npx tsc --noEmit` pass before submitting
- Reference related issues in your PR description

## Reporting Issues

Open an issue with:

- A clear title and description
- Steps to reproduce (if applicable)
- Expected vs actual behavior
- Screenshots if relevant

## License

By contributing, you agree that your contributions will be licensed under the project license.
