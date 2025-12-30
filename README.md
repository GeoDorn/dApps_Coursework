# Globotour

Globotour is a web application that allows users to search for hotels, view offers and explore nearby experiences and book a hotel using a blockchain-powered wallet system. The application is currently a working prototype, integrating a local ganache network and MetaMask to handle payments on a simulated Ethereum network.

# Dependecies and Setup
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

# Testing
## API Testing with Postman
Initially when creating the API calls and setting the scope of the project. Postman was used to test token authentication and initial fetch requests.

Using the publically available [Amadeus Postman Workspace](https://www.postman.com/amadeus4dev/amadeus-for-developers-s-public-workspace/collection/kquqijj/amadeus-for-developers), initial test queries and endpoints could be setup in the server.js.

The first issue during development was the limitations of the first API call. While you could search for hotels using a citycode, you could not search for availability. In addition to this, the API call to fetch availability, required hotelcode. Therefore, I had to use two API calls to search for available rooms matching the customer's criteria. First to search the city for hotels, and then pass the returning hotelcodes into the second API call to fetch offers from those hotels.

However, I quickly encountered a 429 error, too many requests.

In order to prevent too many calls, I collected hotelcodes into an array and passed it through to the API in batches, as pagination is not supported with Amadeus' API.

When a hotel is selected, using the selected hotel's geo-location, the third API calls 5 experiences and tours within 20km of the hotel and displays them beneath the hotels details. 

![alt text](https://github.com/GeoDorn/dApps_Coursework/blob/main/report/API%20Flow.png?raw=true "API Flow Diagram")


## Smart Contract Testing with Mocha/Chai

### Smart Contract Overview
The GlobotourWallet.sol contract manages financial transactions, providing secure and transparent payments that can be tracked via Ganache.

The contract allows users to deposit funds from their MetaMask accounts into their Globotour wallet. It validates that deposit amounts are positive and emits a Deposit event, enabling tracking of funds within Ganache.

The makeBooking() function handles hotel bookings by first validating that the user has a sufficient balance in their Globotour wallet. It then deducts the booking amount from the user’s balance, creates a booking record linked to the user, transfers the ETH to the vendor’s wallet, and emits a BookingCreated event to track the transaction.

Additionally, a PaymentSent event is included to provide further transparency. Together, these three events—Deposit, BookingCreated, and PaymentSent—allow Globotour staff to monitor all transactions and ensure accountability.

### Testing
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

### Mocha/Chai Results

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

### Test Cases
**TC1: Wallet Connection**
```
Action: Click "Connect Wallet"
Expected: MetaMask popup, successful connection
Result: ✓ Pass - Connected
```

**TC2: Network Detection**
```
Action: Load page with MetaMask connected
Expected: Detect Ganache network automatically
Result: ✓ Pass - Network: Localhost (Chain ID: 1337)
```

**TC3: Account Switching**
```
Action: Change account in MetaMask
Expected: App updates wallet address, refreshes balance
Result: ✓ Pass - Address updated immediately
```

**TC4: Deposit Transaction**
```
Action: Deposit 1.0 ETH via UI
Steps:
  1. Click "Add Funds"
  2. Enter amount: 1.0
  3. Confirm in MetaMask
Expected: Transaction confirmed, balance updated
Result: ✓ Pass
Status: Success
```

**TC5: Booking Transaction**
```
Action: Complete hotel booking
Steps:
  1. Search hotels (BFS, 2 guests, Dec 30 - 31)
  2. Select "HOLIDAY INN EXP QUEENS QUARTER"
  3. Click "Pay" (0.104 ETH, 104 GBP)
  4. Confirm in MetaMask
Expected: Booking confirmed, payment sent, confirmation code generated
Result: ✓ Pass
Confirmation: HSO5QV6
Transaction Hash: 0xce36874d266e50ca0ec92aad7a360073aab16ea8eb50e5509d26aa2487028007
```

**TC6: Insufficient Balance**
```
Action: Attempt booking with insufficient balance
Balance: 0.2 ETH
Booking Cost: 0.5 ETH
Expected: Error message before MetaMask popup
Result: ✓ Pass - Error: ""Insufficient funds in your Globotour wallet. Please deposit ETH before booking.""
```

**TC7: Transaction Rejection**
```
Action: Reject transaction in MetaMask
Expected: Error handled gracefully, no state changes
Result: ✓ Pass - Alert: "Transaction failed"
```

**TC8: Balance Display**
```
Action: Check balance after transactions
Initial: 100 ETH (Ganache default)
After deposit (1 ETH): 99 ETH (wallet) + 1 ETH (contract)
After booking (0.5 ETH): 99 ETH (wallet) + 0.5 ETH (contract)
Result: ✓ Pass - Balances correct
```

**TC9: Transaction History**
```
Action: View transaction on Ganache
Expected: All transaction details visible
Result: ✓ Pass - Block number, gas, status all visible
```

#### Test Results Summary
| Test Case | Status |
|-----------|--------|
| TC1 | Pass |
| TC2 | Pass |
| TC3 | Pass |
| TC4 | Pass |
| TC5 | Pass |
| TC6 | Pass |
| TC7 | Pass |
| TC8 | Pass |
| TC9 | Pass |

# Video Demonstration

[Watch the video demonstration](https://github.com/GeoDorn/dApps_Coursework/blob/main/report/Screen%20Recording%202025-12-30%20135559.mp4)


# Evaluation
## Technologies
1. Amadeus Travel API
The Amadeus Travel API was essential in accessing real-world hotel data. The ability to search for hotels in major cities across the globe and retrieve experiences and pricing allowed the prototype to work with "live" data. While the documentation was extremely helpful, having to use two APIs to get one filtered list was an issue. The lack of pagination also proved difficult as I had to then use batches to sort through two JSON arrays to find hotels with availability. However, having a dedicated workspace to build API calls through proved invaluable and was essential in trouble shooting bugs. OAuth2 authentication is robust, users must be careful not to expose sensitive credentials, hence why the .env is not provided in the git repo.

2. Smart Contracts
The blockchain provides unmatched transparency and security for financial transactions, although I found the setup to be quite complex, especially connecting it to MetaMask. Ganache is a great tool to use for testing smart contracts and distributed applications, although it is quite complex for new users. Due to the immutability of smart contracts, once a contract is deployed, it cannot be altered, adding to the security of the transaction.

3. Metamask Wallet Integration
While it boasts widespread support, due to the nature of the blockchain, I found MetaMask to be quite rigid. Through testing, many test accounts were created and I was unable to remove them, simply hide them. I also found the web3 injection into the code, difficult to access initially, as I was unable to progress past the transaction confirmation for some time. However, once I was able to successfully connect to the distributed app through blockchain.js, I was able to access the smart contracts and the local ganache network successfully. 

## Success Criteria
In conclusion, the prototype GloboTour app fullfils the requirements of the customer. It allows users to make bookings for hotels using a secure smart contracts and blockchain technology as stated in the brief. However there are some further implementations I would make to increase the user experience. 

- Implement a full role based account system, where customers can log in and access their preivous bookings and information. Staff should be able to look on the app at monitoring information, instead of using the ganache GUI.

- With accounts, implement email confirmations.

- Add additional filters to the initial search box

- Implememnt the ability to book experiences within the app, rather than having to go to the first party.

- Be able to withdraw ETH back into your wallet on MetaMask

- At present, all bookings go to the vendor (GloboTour), implement a handoff where GloboTour take commission before sending funds to the hotel provider.

That being said, the prototype still accomplishes:

- API consumption and integration (Task 1)
- Smart contract development and deployment (Task 2)
- Transaction monitoring and management (Task 3)
- Comprehensive testing strategy (Task 4)
- Critical evalulation of technlogies (Task 5)

