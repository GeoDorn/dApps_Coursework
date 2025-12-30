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





## MetaMask Integration Testing




# EVAULATION


