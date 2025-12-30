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
-const HOTEL_BOOKING_ADDRESS = "INSERT BOOKING ADDRESS"

5. Run the project from the root directory using:
```
npm run devStart
```
6. At checkout, you will be prompted to connect your wallet via MetaMask.
-Add the local Ganache network in MetaMask
-Add an account using one of the private keys from Ganache's accounts screen



```mermaid
graph LR
  U["User in Browser"] --> UI["Hotel Finder Web App\n(HTML / CSS / JS)"]
  UI -->|"fetch /api/hotels\n/api/bookings"| S["Node / Express\nserver.js"]
  S -->|"HTTPS"| A["Amadeus Hotel API"]

  UI -->|"ethers.js\nwindow.ethereum"| MM["MetaMask\nbrowser extension"]
  MM -->|"JSON-RPC"| G["Ganache\nlocalhost:8545\nchainId 1337"]
  G -->|"executes"| C["HotelBooking.sol\nsmart contract"]

  CU["Customer Account 0"] --> G
  G -->|"forwards ETH"| V["Vendor Account 1"]

```

```mermaid
graph LR
  %% --- Class definitions (colors/styles) ---
  classDef ui       fill:#0f172a,stroke:#38bdf8,color:#e5e7eb,stroke-width:1.5px;
  classDef backend  fill:#022c22,stroke:#34d399,color:#e5e7eb,stroke-width:1.5px;
  classDef chain    fill:#111827,stroke:#a855f7,color:#e5e7eb,stroke-width:1.5px;
  classDef account  fill:#020617,stroke:#f97316,color:#e5e7eb,stroke-dasharray:4 2,stroke-width:1.5px;
  classDef external fill:#020617,stroke:#9ca3af,color:#e5e7eb,stroke-dasharray:3 3;

  %% --- Browser & UI lane ---
  subgraph Browser["Browser & UI"]
    U["User in Browser"] --> UI["Hotel Finder Web App\n(HTML / CSS / JS)"]
  end

  %% --- Backend lane ---
  subgraph Backend["Node Backend & Amadeus"]
    UI -->|"fetch /api/hotels\n/api/bookings"| S["Node / Express\nserver.js"]
    S -->|"HTTPS"| A["Amadeus Hotel API"]
  end

  %% --- Chain lane ---
  subgraph Chain["Wallet & Local Blockchain"]
    UI -->|"ethers.js\nwindow.ethereum"| MM["MetaMask\nbrowser extension"]
    MM -->|"JSON-RPC"| G["Ganache\nlocalhost:8545\nchainId 1337"]
    G -->|"executes"| C["HotelBooking.sol\nsmart contract"]
    CU["Customer Account 0"] --> G
    G -->|"forwards ETH"| V["Vendor Account 1"]
  end

  %% --- Apply classes ---
  class U,UI ui;
  class S backend;
  class A external;
  class MM,G,C chain;
  class CU,V account;

```

