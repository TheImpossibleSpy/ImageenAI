require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Dynamic import for node-fetch (ESM module)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;
const AIHORDE_API_KEY = process.env.AIHORDE_API_KEY;

if (!AIHORDE_API_KEY) {
    console.warn("WARNING: AIHORDE_API_KEY is not set in .env file. Requests will likely fail or be anonymous.");
}

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// Proxy Generate Endpoint
app.post('/proxy/generate', async (req, res) => {
    try {
        const response = await fetch('https://aihorde.net/api/v2/generate/async', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': AIHORDE_API_KEY,
                'Client-Agent': 'ImageenAI-Proxy:1.0.0'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        res.json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Proxy Status Endpoint
app.get('/proxy/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`, {
            method: 'GET',
            headers: {
                'apikey': AIHORDE_API_KEY,
                'Client-Agent': 'ImageenAI-Proxy:1.0.0'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        res.json(data);
    } catch (error) {
        console.error("Proxy status error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`Don't forget to set your API key in .env!`);
});
