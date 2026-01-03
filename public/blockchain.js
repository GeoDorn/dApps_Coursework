// 1 ETH ~ 1000 CURRENCY
const CURRENCY_PER_ETH = 1000;

if (window.ethereum && window.ethereum.on) {
  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

// Deployed contract info
const HOTEL_BOOKING_ADDRESS = "0x6cA21bEF4ceF3DcD3e50e6489C0d55D0eD909c7E";
const HOTEL_BOOKING_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_vendor",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookingId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "vendor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "hotelName",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "checkIn",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "checkOut",
        type: "string",
      },
    ],
    name: "BookingCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "bookingId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "vendor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "PaymentSent",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "balances",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "vendor",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "depositFunds",
    outputs: [],
    stateMutability: "payable",
    type: "function",
    payable: true,
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "hotelName",
        type: "string",
      },
      {
        internalType: "string",
        name: "checkIn",
        type: "string",
      },
      {
        internalType: "string",
        name: "checkOut",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "currency",
        type: "string",
      },
    ],
    name: "makeBooking",
    outputs: [
      {
        internalType: "uint256",
        name: "bookingId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "checkBalance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "getTotalBookings",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "getBooking",
    outputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "string",
        name: "hotelName",
        type: "string",
      },
      {
        internalType: "string",
        name: "checkIn",
        type: "string",
      },
      {
        internalType: "string",
        name: "checkOut",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "currency",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserBookings",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "getVendorAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
];

let provider;
let signer;
let connectedAddress = null;

// Ensure wallet is connected
async function ensureWallet() {
  if (!window.ethereum)
    throw new Error("MetaMask not found – please install it.");

  if (!provider) {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    signer = provider.getSigner();
    connectedAddress = await signer.getAddress();
    console.log("Wallet connected:", connectedAddress);
  }

  return { provider, signer, connectedAddress };
}

// Pay for a booking via contract
async function payForBooking(
  hotelId,
  cityCode,
  price,
  checkInDate,
  checkOutDate
) {
  const { signer, connectedAddress } = await ensureWallet();
  const contract = new ethers.Contract(
    HOTEL_BOOKING_ADDRESS,
    HOTEL_BOOKING_ABI,
    signer
  );

  // Convert Currency -> ETH
  const ethAmount = (price / CURRENCY_PER_ETH).toFixed(4);
  const valueInWei = ethers.utils.parseEther(ethAmount);

  console.log(`Processing booking for ${hotelId}. Amount: ${ethAmount} ETH`);

  const tx = await contract.makeBooking(
    hotelId, // hotelName
    checkInDate, // checkIn
    checkOutDate, // checkOut
    valueInWei, // amount
    "USD" // currency
  );

  const receipt = await tx.wait(1);

  return {
    txHash: receipt.transactionHash,
    ethAmount,
    from: connectedAddress,
    to: HOTEL_BOOKING_ADDRESS,
    network: "Localhost",
  };
}

// Expose helpers to app.js
window.bookingChain = {
  ensureWallet,
  payForBooking,
};
