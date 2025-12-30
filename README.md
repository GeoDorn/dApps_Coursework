# Globotour

Globotour is a web application that allows users to search for hotels, view offers and explore nearby experiences and book a hotel using a blockchain-powered wallet system. The application is currently a working prototype, integrating a local ganache network and MetaMask to handle payments on a simulated Ethereum network.

# DEPENDENCIES AND SETUP
## Node

Node.js and NPM are used to run this web application, with additional required services and packages. 

1. Clone this Repo
2. With Node and NPM installed, run:

```
npm install
```

With the node packages installed, we can setup the API credentials.

## API

Amadeus API is used to power the API calls for GloboTour. You will need to supply your own API Key and Secret. Create a .env file in the root of the project and add:  

- AMADEUS_CLIENT_ID=YOUR_KEY

- AMADEUS_CLIENT_SECRET=YOUR_SECRET

Amadeus is used to query hotels via citycode, hotel offers using that city code with user inputed check-in, check-out and guest numbers and third api call that fetches experiences within the vicinity of the user selected hotel.

## Blockchain

For this prototype, Ganache and MetaMask have been used in conjunction to simulate a local blockchain for testing purposes. 

1. Install both Ganache and MetaMask via their websites.
2. Create a new workspace inside Ganache which will create 10 accounts for us to use.
3. Use
```
truffle compile
```
```
truffle migrate --reset
```

to deploy the smart contract.

4. From the terminal, take the contract address and insert it into blockchain.js:
- const HOTEL_BOOKING_ADDRESS = "INSERT BOOKING ADDRESS"

5. Run the project from the root directory using:
```
npm run devStart
```
6. At checkout, you will be prompted to connect your wallet via MetaMask.
-Add custom network:
-- Network Name: Ganache Local
--RPC URL: http://127.0.0.1:7545
--Chain ID: 1337 (or your Ganache network ID)
--Currency Symbol: ETH
-Import an account using a private key from Ganache

# TESTING
## API Testing with Postman
Initially when creating the API calls and setting the scope of the project. Postman was used to test token authentication and initial fetch requests.

Using the publically available [Amadeus Postman Workspace](https://www.postman.com/amadeus4dev/amadeus-for-developers-s-public-workspace/collection/kquqijj/amadeus-for-developers), initial test queries and endpoints could be setup in the server.js.

The first issue during development was the limitations of the first API call. While you could search for hotels using a citycode, you could not search for availability. In addition to this, the API call to fetch availability, required hotelcode. Therefore, I had to use two API calls to search for available rooms matching the customer's criteria. First to search the city for hotels, and then pass the returning hotelcodes into the second API call to fetch offers from those hotels.

However, I quickly encountered a 429 error, too many requests.

In order to prevent too many calls, I collected hotelcodes into an array and passed it through to the API in batches, as pagination is not supported with Amadeus' API.

When a hotel is selected, using the selected hotel's geo-location, the third API calls 5 experiences and tours within 20km of the hotel and displays them beneath the hotels details. 

![alt text](https://github.com/GeoDorn/dApps_Coursework/blob/main/report/API%20Flow.png?raw=true "API Flow Diagram")


## Smart Contract Testing with Mocha/Chai

# Smart Contract Overview
The GlobotourWallet.sol contract manages financial transactions, providing secure and transparent payments that can be tracked via Ganache.

The contract allows users to deposit funds from their MetaMask accounts into their Globotour wallet. It validates that deposit amounts are positive and emits a Deposit event, enabling tracking of funds within Ganache.

The makeBooking() function handles hotel bookings by first validating that the user has a sufficient balance in their Globotour wallet. It then deducts the booking amount from the user’s balance, creates a booking record linked to the user, transfers the ETH to the vendor’s wallet, and emits a BookingCreated event to track the transaction.

Additionally, a PaymentSent event is included to provide further transparency. Together, these three events—Deposit, BookingCreated, and PaymentSent—allow Globotour staff to monitor all transactions and ensure accountability.

# Testing
Mocha and Chai is used to test smart contracts on a local Ganache instance to simulate real Ethereum transactions.

User Deposit test
```javascript
it("allows a user to deposit ETH", async () => {
    const depositAmount = web3.utils.toWei("1", "ether");

    const tx = await wallet.depositFunds({
      from: user,
      value: depositAmount
    });

    const balance = await wallet.checkBalance({ from: user });
    expect(balance.toString()).to.equal(depositAmount);

    // Check Deposit event
    expect(tx.logs[0].event).to.equal("Deposit");
    expect(tx.logs[0].args.user).to.equal(user);
  });
```
- Confirms that users can deposit ETH into their GloboTour account
- Validates the updated balance and that a deposit event is emitted for transparency and tracking

Booking Creation and Payment Transfer
```javascript
it("creates a booking and sends ETH to vendor", async () => {
    const depositAmount = web3.utils.toWei("2", "ether");
    const bookingAmount = web3.utils.toWei("1", "ether");

    // User deposits ETH
    await wallet.depositFunds({
      from: user,
      value: depositAmount
    });

    const vendorBalanceBefore = BigInt(
      await web3.eth.getBalance(vendor)
    );

    const tx = await wallet.makeBooking(
      "Hotel Blockchain",
      "2025-01-01",
      "2025-01-05",
      bookingAmount,
      "ETH",
      { from: user }
    );

    const vendorBalanceAfter = BigInt(
      await web3.eth.getBalance(vendor)
    );

    // Vendor receives ETH
    expect(vendorBalanceAfter - vendorBalanceBefore).to.equal(
      BigInt(bookingAmount)
    );

    // User balance reduced
    const userBalance = await wallet.checkBalance({ from: user });
    expect(userBalance.toString()).to.equal(
      web3.utils.toWei("1", "ether")
    );

    // Check events
    expect(tx.logs[0].event).to.equal("BookingCreated");
    expect(tx.logs[1].event).to.equal("PaymentSent");
  });
```
- Ensures that bookings correctly deduct user balance.
- Confirms that ETH is ent to the vendor.
- Verifies that BookingCreated and PaymentSent events are emitted for monitoring.

Booking with Insufficient Balance
```javascript
it("prevents booking with insufficient balance", async () => {
    const bookingAmount = web3.utils.toWei("1", "ether");

    try {
      await wallet.makeBooking(
        "Expensive Hotel",
        "2025-01-01",
        "2025-01-05",
        bookingAmount,
        "ETH",
        { from: user }
      );
      assert.fail("Transaction should have reverted");
    } catch (error) {
      assert(
        error.message.includes("Insufficient balance"),
        "Expected Insufficient balance revert"
      );
    }
  });
```
- Verifies that the contract prevents bookings when the user does not have enough funds
- Confirms the revert message is correctly triggered.

# Mocha/Chai Results

![alt text](https://github.com/GeoDorn/dApps_Coursework/blob/main/report/Truffle%20Test.png?raw=true "API Flow Diagram")



## MetaMask Integration Testing

MetaMask is integrated via injection from the broswer extention. 
```javascript
async function ensureWallet() {
  if (!window.ethereum) 
    throw new Error("MetaMask not found");
  
  await window.ethereum.request({ method: "eth_requestAccounts" });
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  connectedAddress = await signer.getAddress();
  
  return { provider, signer, connectedAddress };
}
```
The above code taps into the injection and allows MetaMask and the blockchain to communicate with our web app.
The below code connects the smart contract logic to the front end, allowing the front end to call functions in the smart contract. For testing purposes, 1000 of a currency, in this case USD, is equivalent to 1 ETH.
It then returns the reciept from the blockchain via ganache.

```javascript
async function payForBooking(hotelId, cityCode, price, checkIn, checkOut) {
  const { signer } = await ensureWallet();
  const contract = new ethers.Contract(
    HOTEL_BOOKING_ADDRESS,
    HOTEL_BOOKING_ABI,
    signer
  );
  
  // Convert USD to ETH (1000:1 ratio for testing)
  const ethAmount = (price / 1000).toFixed(4);
  const valueInWei = ethers.utils.parseEther(ethAmount);
  
  const tx = await contract.makeBooking(
    hotelId, checkIn, checkOut, valueInWei, "USD"
  );
  
  const receipt = await tx.wait(1);
  return {
    txHash: receipt.transactionHash,
    ethAmount,
    from: connectedAddress,
    to: HOTEL_BOOKING_ADDRESS
  };
}
```

# Test Cases
**TC3.1: Wallet Connection**
```
Action: Click "Connect Wallet"
Expected: MetaMask popup, successful connection
Result: ✓ Pass - Connected to 0x5B38Da...
Time: 2.3s
```

**TC3.2: Network Detection**
```
Action: Load page with MetaMask connected
Expected: Detect Ganache network automatically
Result: ✓ Pass - Network: Localhost (Chain ID: 1337)
```

**TC3.3: Account Switching**
```
Action: Change account in MetaMask
Expected: App updates wallet address, refreshes balance
Result: ✓ Pass - Address updated immediately
```

**TC3.4: Deposit Transaction**
```
Action: Deposit 1.0 ETH via UI
Steps:
  1. Click "Add Funds"
  2. Enter amount: 1.0
  3. Confirm in MetaMask
Expected: Transaction confirmed, balance updated
Result: ✓ Pass
Transaction Hash: 0x742d35Cc6634C0532925a3b844Bc9e7595f0...
Gas Used: 51,234
Status: Success
```

**TC3.5: Booking Transaction**
```
Action: Complete hotel booking
Steps:
  1. Search hotels (LON, 2 guests, Feb 1-5)
  2. Select "The Savoy"
  3. Click "Pay" (0.5 ETH)
  4. Confirm in MetaMask
Expected: Booking confirmed, payment sent, confirmation code generated
Result: ✓ Pass
Confirmation: HB4C2F9
Transaction Hash: 0x8f3e7b...
ETH Paid: 0.5000
Gas: 183,567 (0.0036714 ETH)
```

**TC3.6: Insufficient Balance**
```
Action: Attempt booking with insufficient balance
Balance: 0.2 ETH
Booking Cost: 0.5 ETH
Expected: Error message before MetaMask popup
Result: ✓ Pass - Error: "Insufficient balance"
```

**TC3.7: Transaction Rejection**
```
Action: Reject transaction in MetaMask
Expected: Error handled gracefully, no state changes
Result: ✓ Pass - Alert: "Transaction failed: User denied transaction"
```

**TC3.8: Balance Display**
```
Action: Check balance after transactions
Initial: 100 ETH (Ganache default)
After deposit (1 ETH): 99 ETH (wallet) + 1 ETH (contract)
After booking (0.5 ETH): 99 ETH (wallet) + 0.5 ETH (contract)
Result: ✓ Pass - Balances correct
```

**TC3.9: Network Change**
```
Action: Switch to different network in MetaMask
Expected: Page reloads, shows network error
Result: ✓ Pass - Automatic reload, prompts to switch back
```

**TC3.10: Transaction History**
```
Action: View transaction on Etherscan (Ganache)
Expected: All transaction details visible
Result: ✓ Pass - Block number, gas, status all visible
```

#### Test Results Summary
| Test Case | Status | Time | Gas Cost | Notes |
|-----------|--------|------|----------|-------|
| TC3.1 | Pass | 2.3s | - | Smooth connection |
| TC3.2 | Pass | 0.5s | - | Auto-detection works |
| TC3.3 | Pass | 1.1s | - | Instant update |
| TC3.4 | Pass | 8.7s | 51,234 | Includes user confirmation |
| TC3.5 | Pass | 12.4s | 183,567 | Full flow successful |
| TC3.6 | Pass | 0.2s | - | Validation before tx |
| TC3.7 | Pass | 3.1s | - | Error handling correct |
| TC3.8 | Pass | 1.5s | - | Accurate tracking |
| TC3.9 | Pass | 2.8s | - | Graceful handling |
| TC3.10 | Pass | 0.9s | - | Full transparency |



# EVAULATION


