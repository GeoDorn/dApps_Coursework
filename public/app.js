const API_BASE_URL = 'http://localhost:3000';

let HOTELS = [];
let EXPERIENCES = [];
let HOTELOFFERS = [];
let BASKET = [];
let SELECTED = null;
let WALLETCONNECTED = false;
let WALLETADDRESS = null;

/* ---------- INITIALIZATION ---------- */
document.addEventListener('DOMContentLoaded', () => {
    initDateInputs();
    bindHotelForm();
    checkWalletConnection();

    if (window.ethereum) {
        window.ethereum.on("accountsChanged", (accounts) => {
            WALLETADDRESS = accounts[0] || null;
            WALLETCONNECTED = accounts.length > 0;
            showCheckoutScreen();
        });
    }
});

/* ---------- DATE INPUTS ---------- */
function initDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    const checkIn = document.getElementById('checkInDate');
    const checkOut = document.getElementById('checkOutDate');

    checkIn.min = today;
    checkIn.value = today;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    checkOut.min = tomorrow.toISOString().split('T')[0];
    checkOut.value = checkOut.min;

    checkIn.addEventListener('change', () => {
        const date = new Date(checkIn.value);
        date.setDate(date.getDate() + 1);
        checkOut.min = date.toISOString().split('T')[0];

        if (checkOut.value <= checkIn.value) {
            checkOut.value = checkOut.min;
        }
    });
}

/* ---------- HOTEL SEARCH ---------- */
function bindHotelForm() {
    document.getElementById('hotelForm').addEventListener('submit', e => {
        e.preventDefault();
        clearResults();
        fetchHotelOffers(
            document.getElementById('destinationCityCode').value,
            document.getElementById('checkInDate').value,
            document.getElementById('checkOutDate').value,
            document.getElementById('guests').value
        );
    });
}

function clearResults() {
    ['hotelResults', 'hotelDetails', 'hotelOffers', 'bookingDetails', 'checkoutScreen']
        .forEach(id => document.getElementById(id).innerHTML = '');
}

async function fetchHotelOffers(cityCode, checkIn, checkOut, adults) {
    const container = document.getElementById('hotelResults');
    container.innerHTML = '<p>Searching for hotel offers, please wait...</p>';

    const res = await fetch(`${API_BASE_URL}/api/hotels?cityCode=${encodeURIComponent(cityCode)}`);
    const hotelsData = await res.json();
    if (!res.ok) throw new Error(hotelsData.error);

    HOTELS = hotelsData.data || [];
    if (!HOTELS.length) {
        container.innerHTML = '<p>No hotels found.</p>';
        return;
    }

    const ids = HOTELS.slice(0, 100).map(h => h.hotelId);
    const offersRes = await fetch(`${API_BASE_URL}/api/hotels/offers/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelIds: ids, adults: Number(adults), checkInDate: checkIn, checkOutDate: checkOut })
    });

    const offersData = await offersRes.json();
    if (!offersRes.ok) throw new Error(offersData.error);

    HOTELOFFERS = offersData.data.map(o => ({
        hotel: HOTELS.find(h => h.hotelId === o.hotel.hotelId) || o.hotel,
        offers: o.offers
    }));

    renderHotelResults();
}

function renderHotelResults() {
    const container = document.getElementById('hotelResults');
    if (!HOTELOFFERS.length) {
        container.innerHTML = '<p>No offers available.</p>';
        return;
    }

    container.innerHTML = HOTELOFFERS.map(h => `
        <div>
            <h3>${h.hotel.name}</h3>
            <p>${h.hotel.address?.lines?.join(', ') || ''}</p>
            <p>${h.hotel.address?.cityName || ''} ${h.hotel.address?.countryCode || ''}</p>
            <p>${h.offers[0].price.currency} ${h.offers[0].price.total}</p>
            <button data-id="${h.hotel.hotelId}" class="hotelDetailsButton">View Details</button>
        </div>
    `).join('');

    document.querySelectorAll('.hotelDetailsButton').forEach(b =>
        b.addEventListener('click', () => showHotelDetails(b.dataset.id))
    );
}

/* ---------- HOTEL DETAILS & EXPERIENCES ---------- */
async function showHotelDetails(hotelId) {
    SELECTED = HOTELOFFERS.find(h => h.hotel.hotelId === hotelId);
    if (!SELECTED) return;

    const c = document.getElementById('hotelDetails');
    c.innerHTML = `
        <h2>${SELECTED.hotel.name}</h2>
        <p>${SELECTED.hotel.address?.lines?.join(', ')}</p>
        ${SELECTED.offers.map(o => `
            <div>
                <p>${o.room?.description?.text || ''}</p>
                <p>${o.price.currency} ${o.price.total}</p>
                <button onclick="selectOffer('${o.id}')">Select</button>
            </div>
        `).join('')}
        <h3>Nearby Experiences</h3>
        <div id="experiencesSection">Loading...</div>
    `;

    c.scrollIntoView({ behavior: 'smooth' });

    const { latitude, longitude } = SELECTED.hotel.geoCode || {};
    if (latitude && longitude) {
        await fetchExperiences(latitude, longitude, 10);
        renderExperiences();
    } else {
        document.getElementById('experiencesSection').innerHTML = '<p>No location data.</p>';
    }
}

function selectOffer(offerId) {
    const offer = SELECTED.offers.find(o => o.id === offerId);
    if (!offer) return;

    BASKET = [{ hotel: SELECTED.hotel, offer }];
    clearResults();
    showCheckoutScreen();
}

async function fetchExperiences(lat, lng, radius) {
    const res = await fetch(`${API_BASE_URL}/api/experiences?latitude=${lat}&longitude=${lng}&radius=${radius}`);
    const data = await res.json();
    EXPERIENCES = res.ok
        ? (data.data || []).filter(e => !e.name.toLowerCase().includes('private transfer')).slice(0, 5)
        : [];
}

function renderExperiences() {
    const c = document.getElementById('experiencesSection');
    if (!EXPERIENCES.length) {
        c.innerHTML = '<p>No experiences found.</p>';
        return;
    }

    c.innerHTML = EXPERIENCES.map(e => `
        <div>
            <h4>${e.name}</h4>
            <p>${e.description || ''}</p>
            <p>${e.price?.currencyCode || ''} ${e.price?.amount || ''}</p>
        </div>
    `).join('');
}

/* ---------- CHECKOUT & WALLET ---------- */
async function showCheckoutScreen() {
    const c = document.getElementById('checkoutScreen');
    if (!BASKET.length) {
        c.innerHTML = '<p>Basket empty.</p>';
        return;
    }

    if (!WALLETCONNECTED) {
        c.innerHTML = `<h2>Checkout</h2><button onclick="connectMetaMask()">Connect Wallet</button>`;
        return;
    }

    const balance = await getWalletBalance();
    const item = BASKET[0];

    c.innerHTML = `
        <h2>Checkout</h2>
        <p>Wallet: ${WALLETADDRESS}</p>
        <p>Contract Balance: ${balance} ETH</p>
        <button onclick="depositFunds()">Add Funds</button>
        <hr>
        <p><strong>Item:</strong> ${item.hotel.name}</p>
        <p><strong>Total:</strong> ${item.offer.price.currency} ${item.offer.price.total}</p>
        <button onclick="completeBooking()">Pay</button>
    `;
}

async function completeBooking() {
    if (!BASKET.length) return alert("No booking selected.");

    try {
        const item = BASKET[0];
        const priceUsd = item.offer.price.total;
        const hotelId = item.hotel.hotelId;
        const cityCode = item.hotel.address.cityName;
        const checkIn = document.getElementById('checkInDate').value;
        const checkOut = document.getElementById('checkOutDate').value;

        const txReceipt = await window.bookingChain.payForBooking(
            hotelId, cityCode, priceUsd, checkIn, checkOut
        );

        const bookingData = {
            hotelId, hotelName: item.hotel.name, cityCode, checkIn, checkOut,
            guests: document.getElementById('guests').value,
            fullName: "Guest User", email: "guest@example.com",
            price: priceUsd, txHash: txReceipt.txHash, ethAmount: txReceipt.ethAmount,
            payer: txReceipt.from, vendor: txReceipt.to, network: txReceipt.network
        };

        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            const booking = (await response.json()).booking;
            clearResults();

            const c = document.getElementById('checkoutScreen');
            c.innerHTML = `
                <h2>Booking Confirmed!</h2>
                <p>Thank you for your booking.</p>
                <hr>
                <p><strong>Hotel:</strong> ${booking.hotelName}</p>
                <p><strong>City:</strong> ${booking.cityCode}</p>
                <p><strong>Check-in:</strong> ${booking.checkIn}</p>
                <p><strong>Check-out:</strong> ${booking.checkOut}</p>
                <p><strong>Guests:</strong> ${booking.guests}</p>
                <hr>
                <p><strong>Total Paid:</strong> ${booking.price} ${item.offer.price.currency}</p>
                <p><strong>ETH Paid:</strong> ${booking.ethAmount} ETH</p>
                <p><strong>Transaction Hash:</strong>${booking.txHash}</p>
                <p><strong>Confirmation Code:</strong> ${booking.confirmation}</p>
                <hr>
                <button onclick="window.location.reload()">Make Another Booking</button>
            `;
        }

    } catch (error) {
        console.error("Payment failed:", error);
        alert("Transaction failed: " + error.message);
    }
}

async function connectMetaMask() {
    try {
        const { connectedAddress } = await window.bookingChain.ensureWallet();
        WALLETADDRESS = connectedAddress;
        WALLETCONNECTED = true;
        showCheckoutScreen();
    } catch (error) {
        alert(error.message);
    }
}

async function getWalletBalance() {
    const { signer } = await window.bookingChain.ensureWallet();
    const contract = new ethers.Contract(HOTEL_BOOKING_ADDRESS, HOTEL_BOOKING_ABI, signer);
    const balance = await contract.checkBalance();
    return ethers.utils.formatEther(balance);
}

async function depositFunds() {
    const amountEth = prompt("How much ETH would you like to deposit?");
    if (!amountEth || isNaN(amountEth)) return;

    try {
        const { signer } = await window.bookingChain.ensureWallet();
        const contract = new ethers.Contract(HOTEL_BOOKING_ADDRESS, HOTEL_BOOKING_ABI, signer);
        const tx = await contract.depositFunds({ value: ethers.utils.parseEther(amountEth) });
        await tx.wait();
        alert("Deposit Successful!");
        showCheckoutScreen();
    } catch (error) {
        console.error("Deposit failed:", error);
    }
}

/* ---------- WALLET CONNECTION CHECK ---------- */
async function checkWalletConnection() {
    if (!window.ethereum) return;

    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        WALLETADDRESS = accounts[0] || null;
        WALLETCONNECTED = accounts.length > 0;
        showCheckoutScreen();
    } catch (err) {
        console.error("Wallet check failed:", err);
    }
}
