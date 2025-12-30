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
-Add the local Ganache network in MetaMask
-Add an account using one of the private keys from Ganache's accounts screen

# TESTING
## API Testing with Postman
Initially when creating the API calls and setting the scope of the project. Postman was used to test token authentication and initial fetch requests.

Using the publically available [Amadeus Postman Workspace](https://www.postman.com/amadeus4dev/amadeus-for-developers-s-public-workspace/collection/kquqijj/amadeus-for-developers), initial queries and endpoints could be setup in the server.js.

The first issue during development was the limitations of the first API call. While you could search for hotels using a citycode, you could not search for availability. In addition to this, the API call to fetch availability, required hotelcode. Therefore, I had to use two API calls to search for available rooms matching the customer's criteria. First to search the city for hotels, and then pass the returning hotelcodes into the second API call to fetch offers from those hotels.

However, I quickly encountered a 429 error, too many requests.

In order to prevent too many calls, I collected hotelcodes into an array and passed it through to the API in batches, as pagination is not supported with Amadeus' API.

When a hotel is selected, using the selected hotel's geo-location, the third API calls 5 experiences and tours within 20km of the hotel and displays them beneath the hotels details. 




# EVAULATION
