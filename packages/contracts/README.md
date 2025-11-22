# Coco Smart Contracts

Smart contracts for the Coco platform, built with Foundry.

## Overview

This package contains the smart contracts for Coco's automated yield optimization system:

- **YieldAutomator**: Main contract that integrates with Chainlink Automation and Functions to automatically rebalance user funds across different Aqua Protocol strategies for optimal yield.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Installation

```bash
forge install
```

## Build

```bash
forge build
# or
pnpm build
```

## Test

```bash
forge test -vv
# or
pnpm test

# With gas reporting
pnpm test:gas
```

## Deploy

### Base Sepolia (Testnet)

1. Create a `.env` file based on `.env.example`
2. Add your private key and RPC URL
3. Deploy:

```bash
pnpm deploy:base-sepolia
```

### Base (Mainnet)

```bash
pnpm deploy:base
```

## Contract Addresses

### Base Sepolia

- YieldAutomator: TBD
- Chainlink Functions Router: `0xf9B8fc078197181C841c296C876945aaa425B278`

### Base Mainnet

- YieldAutomator: TBD

## Architecture

The YieldAutomator contract:

1. Uses Chainlink Automation to check if users need rebalancing
2. Uses Chainlink Functions to fetch real-time APY data from Aqua strategies
3. Automatically executes `dock` and `ship` operations on Aqua Protocol
4. Ensures minimum time intervals and APY differences before rebalancing

## Development

Format code:

```bash
forge fmt
# or
pnpm fmt
```

Clean build artifacts:

```bash
forge clean
# or
pnpm clean
```

## License

MIT
