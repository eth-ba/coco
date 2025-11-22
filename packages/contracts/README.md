# Coco Smart Contracts

Foundry-based smart contracts for the Coco platform - automated yield optimization using Aqua Protocol and Chainlink.

## Architecture

```
User Deposits USDC
  ↓
YieldAutomator.deposit()
  ↓
Aqua Protocol (0x4999...)
  ↓
AquaApp Strategy (Aave/Compound/etc.)

Chainlink Automation → checkUpkeep() → performUpkeep()
  ↓ Rebalances between strategies
Aqua.dock(oldStrategy) + Aqua.ship(newStrategy)

Chainlink Functions → fetch-apy.js → fulfillRequest()
  ↓ Updates APY data
strategyAPY[] mapping updated
```

## Contracts

### YieldAutomator.sol
Main contract that manages:
- **User Deposits**: `deposit(amount, strategyIndex)` - Ships USDC to Aqua strategies
- **User Withdrawals**: `withdraw()` - Docks USDC from Aqua strategies
- **Automated Rebalancing**: Chainlink Automation calls `performUpkeep()` to move funds to higher-yield strategies
- **APY Updates**: Chainlink Functions fetches real-time APY data from DeFi protocols

### IAqua.sol
Interface for Aqua Protocol contract at `0x499943e74fb0ce105688beee8ef2abec5d936d31`

## Key Features

✅ **No Mock Data**: All APY data fetched from real DeFi protocols (Aave, Compound, DeFiLlama)
✅ **Real Aqua Integration**: Uses actual Aqua Protocol `ship()` and `dock()` functions
✅ **Chainlink Automation**: Automated rebalancing when better yields are available
✅ **Chainlink Functions**: Real-time APY data from multiple sources

## Setup

```bash
# Install Foundry dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Run tests with gas reporting
forge test --gas-report
```

## Deployment

### 1. Set up environment variables

Create `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### 2. Deploy to Base Sepolia

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 3. Add Strategies

After deployment, add AquaApp strategies:

```bash
cast send <YIELD_AUTOMATOR_ADDRESS> \
  "addStrategy(address,uint256)" \
  <AQUA_APP_ADDRESS> \
  850 \  # 8.5% APY in basis points
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 4. Register Chainlink Automation

1. Go to [Chainlink Automation](https://automation.chain.link/)
2. Register new Upkeep
3. Target contract: YieldAutomator address
4. Check data: Encode array of user addresses to monitor
5. Fund with LINK tokens

### 5. Set up Chainlink Functions

1. Create Functions subscription at [Chainlink Functions](https://functions.chain.link/)
2. Fund subscription with LINK
3. Call `requestAPYData()` with the JavaScript source from `packages/functions/fetch-apy.js`

## Contract Addresses

### Base Sepolia
- **Aqua Protocol**: `0x499943e74fb0ce105688beee8ef2abec5d936d31`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **YieldAutomator**: (Deploy and update here)

## Usage

### For Users

**Deposit USDC:**
```solidity
// 1. Approve YieldAutomator to spend USDC
IERC20(USDC).approve(yieldAutomatorAddress, amount);

// 2. Deposit to strategy index 0
yieldAutomator.deposit(1000000, 0); // 1 USDC (6 decimals), strategy 0
```

**Withdraw USDC:**
```solidity
yieldAutomator.withdraw(); // Withdraws all funds from current strategy
```

### For Chainlink Automation

The contract automatically handles rebalancing when:
- A better strategy exists (APY difference > 0.5%)
- Minimum time has passed since last rebalance (1 hour)
- `checkUpkeep()` returns true

### For Chainlink Functions

APY data is fetched from:
- **Aave V3 API**: Real-time lending rates
- **Compound V3 API**: Real-time supply rates
- **DeFiLlama API**: Aggregated yield data

## Testing

```bash
# Run all tests
forge test

# Run specific test
forge test --match-test testDeposit

# Run with verbosity
forge test -vvv

# Run with gas reporting
forge test --gas-report
```

## Security Considerations

⚠️ **Important Notes:**
1. Users must approve YieldAutomator to spend their USDC before depositing
2. Funds are managed through Aqua Protocol's virtual balance system
3. Actual USDC stays in user's wallet until pulled during trades
4. Rebalancing requires user's ongoing USDC approval to Aqua Protocol
5. Contract owner can add new strategies and manually update APY (for testing/emergency)

## License

MIT
