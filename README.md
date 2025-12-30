# Globotour

Globotour is a web application that allows users to search for hotels, view offers and explore nearby experiences and book a hotel using a blockchain-powered wallet system. The application is currently a working prototype, integrating a local ganache network and MetaMask to handle payments on a simulated Ethereum network.

# DEPENDENCIES AND SETUP

Node.js and NPM are used to run the web application. Additional packages and services are required to run Globotour.

The list of node packages are stored in package.json
Using "npm install" will install all required compatible versions.

Amadeus API is used to power the API calls.
Create a .env file in the root of the project and populate:

AMADEUS_CLIENT_ID=YOUR_KEY
AMADEUS_CLIENT_SECRET=YOUR_SECRET

Ganache and MetaMask is used to simulate the blockchain in a local environment for testing. 
Inside blockchain.js, replace Contract address with the address from the newly created Ganache instance. 

Download ganache and initialize a workspace.

Use truffle compile and truffle migrate --reset to deploy smart contract.

From terminal, copy and paste the contract address and insert it into blockchain.js.

Once the prerequisites have been met, to start project, open terminal: "npm run devStart"

Ensure MetaMask is connected to your local Ganache network (usually RPC http://127.0.0.1:7545)


