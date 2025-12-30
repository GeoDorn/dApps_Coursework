const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const AMADEUS_TOKEN_URL = "https://test.api.amadeus.com/v1/security/oauth2/token";
const AMADEUS_HOTELS_URL = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city";
const AMADEUS_OFFERS_URL = "https://test.api.amadeus.com/v3/shopping/hotel-offers";
const AMADEUS_EXPERIENCES_URL = "https://test.api.amadeus.com/v1/shopping/activities";

// --- Token cache ---
let cachedToken = null;
let tokenExpTs = 0;

async function getServerAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < (tokenExpTs - 60)) return cachedToken;

  const resp = await fetch(AMADEUS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data.error_description || "Token request failed";
    throw new Error(msg);
  }
  
  cachedToken = data.access_token;
  tokenExpTs = now + (data.expires_in || 1799);
  return cachedToken;
}

// --- Hotels by city ---
app.get("/api/hotels", async (req, res) => {
  try {
    const cityCode = String(req.query.cityCode || "").toUpperCase();
    if (!cityCode) return res.status(400).json({ error: "Missing cityCode" });

    const token = await getServerAccessToken();
    const r = await fetch(
      `${AMADEUS_HOTELS_URL}?cityCode=${encodeURIComponent(cityCode)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const payload = await r.json();
    res.status(r.status).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err.message || err) });
  }
});

// --- Hotel offers ---
app.get("/api/hotels/offers", async (req, res) => {
  try {
    const hotelIds = String(req.query.hotelIds || "");
    const checkIn = String(req.query.checkInDate || "");
    const checkOut = String(req.query.checkOutDate || "");
    const adults = Number(req.query.adults || 1);

    if (!hotelIds) return res.status(400).json({ error: "Missing hotelIds" });
    if (!checkIn || !checkOut) return res.status(400).json({ error: "Missing dates" });

    const token = await getServerAccessToken();
    const url = `${AMADEUS_OFFERS_URL}?hotelIds=${encodeURIComponent(hotelIds)}&adults=${adults}&checkInDate=${encodeURIComponent(checkIn)}&checkOutDate=${encodeURIComponent(checkOut)}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const payload = await r.json();
    res.status(r.status).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err.message || err) });
  }
});

// --- Batch hotel offers ---
app.post("/api/hotels/offers/batch", async (req, res) => {
  try {
    const { hotelIds, adults, checkInDate, checkOutDate } = req.body;

    if (!Array.isArray(hotelIds) || !hotelIds.length) {
      return res.status(400).json({ error: "Missing hotelIds array" });
    }
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ error: "Missing dates" });
    }

    const token = await getServerAccessToken();
    const hotelsWithOffers = [];
    const batchSize = 50;

    for (let i = 0; i < hotelIds.length; i += batchSize) {
      const batch = hotelIds.slice(i, i + batchSize).join(",");
      const url = `${AMADEUS_OFFERS_URL}?hotelIds=${encodeURIComponent(batch)}&adults=${adults || 1}&checkInDate=${encodeURIComponent(checkInDate)}&checkOutDate=${encodeURIComponent(checkOutDate)}`;

      try {
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (r.ok) {
          const payload = await r.json();
          if (Array.isArray(payload.data)) {
            const available = payload.data.filter(
              h => h.available && h.offers?.length > 0
            );
            hotelsWithOffers.push(...available);
          }
        } else if (r.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        console.error("Batch error:", err);
      }

      if (i + batchSize < hotelIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    res.json({
      data: hotelsWithOffers,
      checked: hotelIds.length,
      found: hotelsWithOffers.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err.message || err) });
  }
});

// --- Experiences ---
app.get("/api/experiences", async (req, res) => {
  try {
    const lat = String(req.query.latitude || "");
    const lon = String(req.query.longitude || "");
    const radius = Number(req.query.radius || 20);
    
    if (!lat || !lon) return res.status(400).json({ error: "Missing coordinates" });

    const token = await getServerAccessToken();
    const r = await fetch(
      `${AMADEUS_EXPERIENCES_URL}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&radius=${radius}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const payload = await r.json();
    res.status(r.status).json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err.message || err) });
  }
});

// --- Fake bookings (in-memory) ---
const bookings = [];

function makeConfirmation() {
  return "H" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

app.post("/api/bookings", (req, res) => {
  const {
    hotelId, hotelName, cityCode,
    checkIn, checkOut, guests,
    fullName, email, price,
    txHash, ethAmount,
    payer, vendor, network
  } = req.body || {};

  if (!fullName || !email || !checkIn || !checkOut) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const record = {
    confirmation: makeConfirmation(),
    hotelId: hotelId || null,
    hotelName: hotelName || null,
    cityCode: cityCode || null,
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    guests: Number(guests) || 1,
    fullName,
    email,
    price: Number(price) || 0,
    txHash: txHash || null,
    ethAmount: Number(ethAmount) || 0,
    payer: payer || null,
    vendor: vendor || null,
    network: network || null,
    createdAt: new Date().toISOString()
  };

  bookings.push(record);
  res.status(201).json({ ok: true, booking: record });
});

app.get("/api/bookings", (_req, res) => {
  res.json({ data: bookings.slice().reverse() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));