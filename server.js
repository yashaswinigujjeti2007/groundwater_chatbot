const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic in-memory rate limiter (per IP)
const rateMap = new Map();
const RATE_LIMIT_MAX = 10; // requests
const RATE_LIMIT_WINDOW = 10 * 1000; // ms

// Health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const db = require('./db');
// ai module will be required inside route to allow test mocks to take effect

// History endpoints
app.get('/api/history', (req, res) => {
  try {
    const history = db.getHistory(200);
    res.json({ history });
  } catch (err) {
    console.error('Error in /api/history', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/history', (req, res) => {
  try {
    // optional safety: require env var to allow clears in production
    if (process.env.ALLOW_CLEAR_HISTORY !== 'true') {
      return res.status(403).json({ error: 'Clearing history is disabled' });
    }
    db.clearHistory();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error clearing history', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/message', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = rateMap.get(ip) || { count: 0, start: now };
    if (now - entry.start > RATE_LIMIT_WINDOW) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    rateMap.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'Too many requests, slow down' });
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string')
      return res.status(400).json({ error: 'No message provided' });
    if (message.length > 1000) return res.status(400).json({ error: 'Message too long' });

    const sanitized = message.replace(/\s+/g, ' ').trim();

    // Save user message first (ensures persistence even if AI fails)
    db.saveMessage('user', sanitized);

    // Require AI module here so tests can mock it after the server module has been loaded
    const { getAIReply } = require('./ai');
    const reply = await getAIReply(sanitized);

    // save the reply
    db.saveMessage('bot', reply);

    res.json({ reply });
  } catch (err) {
    console.error('Error in /api/message', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
