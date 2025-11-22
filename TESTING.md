# Testing Guide for Coco - Aqua Protocol Integration

This guide walks you through testing the Aqua Protocol deposit feature on Base Sepolia testnet.

## Prerequisites

### 1. Get Test Funds

You'll need:
- **Base Sepolia ETH** (for gas fees)
- **Base Sepolia USDC** (for deposits)

#### Get Base Sepolia ETH:
1. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your wallet
3. Request testnet ETH

#### Get Base Sepolia USDC:
The USDC address we're using is: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

**Option 1: Use a faucet (if available)**
- Check [Circle's USDC Faucet](https://faucet.circle.com/) for Base Sepolia

**Option 2: Mint test USDC (if contract allows)**
- Some test USDC contracts have a `mint()` function
- Check on [BaseScan Sepolia](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e)

**Option 3: Swap testnet ETH for USDC**
- Use a testnet DEX on Base Sepolia

### 2. Important Addresses

```
Network: Base Sepolia (Chain ID: 84532)
Aqua Contract: 0x499943e74fb0ce105688beee8ef2abec5d936d31
USDC Token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Aqua App: 0x0000000000000000000000000000000000000000 (PLACEHOLDER - needs real app)
```

⚠️ **Note**: The Aqua App address is currently a placeholder. You'll need to deploy or use an existing Aqua app contract (like XYCSwap) on Base Sepolia.

## Testing Steps

### Step 1: Start the Development Server

```bash
cd /Users/jonathancruz/Desktop/coco/apps/web
pnpm dev
```

Open http://localhost:3000 in your browser.

### Step 2: Authenticate with Privy

1. Click "Get Started" on the landing page
2. Enter your email address
3. Verify with the code sent to your email
4. Privy will automatically create a Smart Account for you
5. You'll be redirected to the dashboard

### Step 3: Fund Your Smart Account

Your Smart Account address is displayed on the dashboard. You need to send:
- **Base Sepolia ETH** (for gas) - at least 0.01 ETH
- **Base Sepolia USDC** (for deposits) - any amount you want to test with

**How to send funds:**
1. Copy your Smart Account address from the dashboard
2. Use MetaMask or another wallet to send funds to that address
3. Verify on [BaseScan Sepolia](https://sepolia.basescan.org/)

### Step 4: Test the Deposit Flow

1. **Navigate to Dashboard** (should already be there)
2. **Enter Amount**: Type an amount of USDC (e.g., "10")
3. **Click "Deposit to Aqua"**
4. **Observe the Flow**:
   - Button shows "Processing..." with spinner
   - Console logs show:
     - "Step 1: Approving USDC..."
     - "Approval transaction sent: {hash}"
     - "Step 2: Shipping liquidity to Aqua..."
     - "Ship transaction sent: {hash}"
     - "Strategy hash: {hash}"
   - Success message appears with transaction hash

### Step 5: Verify on Block Explorer

1. **Copy the transaction hash** from the success message
2. **Visit BaseScan Sepolia**: https://sepolia.basescan.org/tx/{YOUR_TX_HASH}
3. **Verify**:
   - Transaction status is "Success"
   - "To" address is the Aqua contract
   - Events are emitted (look for "Shipped" event)

### Step 6: Check Aqua Balance

You can verify your virtual balance in Aqua using the contract's `rawBalances` function:

1. Go to [Aqua Contract on BaseScan](https://sepolia.basescan.org/address/0x499943e74fb0ce105688beee8ef2abec5d936d31#readContract)
2. Call `rawBalances` with:
   - `maker`: Your Smart Account address
   - `app`: The Aqua app address (currently placeholder)
   - `strategyHash`: From console logs
   - `token`: USDC address (0x036CbD53842c5426634e7929541eC2318f3dCF7e)

## Test Cases

### ✅ Happy Path Tests

1. **Small Amount Deposit**
   - Amount: 1 USDC
   - Expected: Success

2. **Large Amount Deposit**
   - Amount: 100 USDC
   - Expected: Success

3. **Decimal Amount**
   - Amount: 10.50 USDC
   - Expected: Success

### ⚠️ Error Cases to Test

1. **Insufficient Balance**
   - Amount: More than your USDC balance
   - Expected: Transaction fails with error message

2. **Insufficient Gas**
   - Remove ETH from Smart Account
   - Expected: Transaction fails with gas error

3. **Zero Amount**
   - Amount: 0
   - Expected: Submit button disabled

4. **Invalid Amount**
   - Amount: Negative or empty
   - Expected: Submit button disabled

5. **Not Authenticated**
   - Log out and try to access dashboard
   - Expected: Redirect to login page

## Debugging

### Check Console Logs

Open browser DevTools (F12) and check the Console tab for:
- Transaction hashes
- Error messages
- Strategy hash
- Step-by-step progress

### Common Issues

**Issue**: "No smart account found"
- **Solution**: Make sure you're logged in with Privy

**Issue**: "Insufficient funds"
- **Solution**: Fund your Smart Account with ETH and USDC

**Issue**: Transaction pending forever
- **Solution**: Check BaseScan for transaction status. Base Sepolia can be slow.

**Issue**: "Transaction failed"
- **Solution**: Check if:
  - You have enough ETH for gas
  - You have enough USDC for the amount
  - The Aqua app address is valid (currently placeholder)

## Next Steps

After successful testing:

1. **Deploy or integrate a real Aqua app** (like XYCSwap) on Base Sepolia
2. **Update `AQUA_APP_ADDRESS`** in `apps/web/src/hooks/useDeposit.ts`
3. **Implement balance fetching** to show real-time USDC balance
4. **Add transaction history** to track deposits
5. **Implement withdraw flow** (dock transaction)

## Useful Links

- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [BaseScan Sepolia](https://sepolia.basescan.org/)
- [Aqua Protocol Docs](https://github.com/1inch/aqua)
- [Privy Docs](https://docs.privy.io/)
- [Base Docs](https://docs.base.org/)

## Test Checklist

- [ ] Smart Account created via Privy
- [ ] Smart Account funded with ETH
- [ ] Smart Account funded with USDC
- [ ] Deposit form loads correctly
- [ ] Amount input works
- [ ] Submit button enables/disables properly
- [ ] Approval transaction executes
- [ ] Ship transaction executes
- [ ] Success message displays
- [ ] Transaction hash is shown
- [ ] Transaction visible on BaseScan
- [ ] Aqua balance updated (if app is deployed)
- [ ] Error handling works for edge cases
- [ ] Console logs show progress
- [ ] UI is responsive on mobile

---

**Note**: This is a testnet implementation. Do NOT use real funds or deploy to mainnet without thorough auditing and testing.

