// server/routes/adminPanel.js
const express = require('express');
const crypto = require('crypto');
const Match = require('../models/Match');
const { buildMarkets } = require('../utils/marketBuilder');
const router = express.Router();

const ADMIN_TOKEN = process.env.ADMIN_PANEL_TOKEN || 'demo-admin-4656460';
const predictionSlugs = new Map();

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.body?.adminToken || req.query?.adminToken;
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

function applyOddsToMarkets(match, odds = {}) {
  if (!match.markets || !Array.isArray(match.markets)) return;
  const sport = (match.sport || 'soccer').toLowerCase();
  const findIdx = (name) => match.markets.findIndex(m => m.name === name);

  if (sport === 'soccer') {
    const hIdx = findIdx('1');
    const dIdx = findIdx('X');
    const aIdx = findIdx('2');
    if (hIdx >= 0 && odds.home) match.markets[hIdx].odds = Number(odds.home);
    if (dIdx >= 0 && odds.draw) match.markets[dIdx].odds = Number(odds.draw);
    if (aIdx >= 0 && odds.away) match.markets[aIdx].odds = Number(odds.away);
  } else {
    const hIdx = findIdx('Home');
    const aIdx = findIdx('Away');
    if (hIdx >= 0 && odds.home) match.markets[hIdx].odds = Number(odds.home);
    if (aIdx >= 0 && odds.away) match.markets[aIdx].odds = Number(odds.away);
  }
}

// ============ AUTH ============
router.post('/login', (req, res) => {
  const { token } = req.body || {};
  if (token === ADMIN_TOKEN) return res.json({ success: true });
  res.status(401).json({ success: false, message: 'Wrong token' });
});

// ============ LIST ============
router.get('/matches', requireAdmin, async (req, res) => {
  try {
    const { sport, status, limit = 100 } = req.query;
    const query = {};
    if (sport) query.sport = sport;
    if (status) query.status = status;

    const matches = await Match.find(query).sort({ startsAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: matches.length, data: matches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ CREATE ============
router.post('/matches', requireAdmin, async (req, res) => {
  try {
    const {
      sport = 'soccer', league, homeTeam, awayTeam, startsAt,
      finalHomeScore, finalAwayScore, odds = {},
      markets: customMarkets // <-- NEW: Accept custom markets
    } = req.body;

    if (!league || !homeTeam || !awayTeam || !startsAt) {
      return res.status(400).json({
        success: false,
        message: 'league, homeTeam, awayTeam, startsAt are required',
      });
    }

    const start = new Date(startsAt);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid startsAt' });
    }

    const hasScript =
      finalHomeScore !== undefined && finalHomeScore !== '' &&
      finalAwayScore !== undefined && finalAwayScore !== '';

    // Use custom markets if provided, otherwise generate full catalog
    const markets = customMarkets && Array.isArray(customMarkets) && customMarkets.length > 0
      ? customMarkets 
      : buildMarkets(sport, odds);

    const match = await Match.create({
      sport,
      league,
      homeTeam: { name: homeTeam, abbreviation: homeTeam.substring(0, 3).toUpperCase() },
      awayTeam: { name: awayTeam, abbreviation: awayTeam.substring(0, 3).toUpperCase() },
      startsAt: start,
      date: start,
      time: start.toLocaleTimeString(),
      status: 'SCHEDULED',
      minute: 0,
      score: { home: 0, away: 0 },
      markets,
      events: [],
      source: 'admin-manual',
      scriptedOutcome: hasScript
        ? { homeScore: Number(finalHomeScore), awayScore: Number(finalAwayScore) }
        : { homeScore: null, awayScore: null },
    });

    res.json({ success: true, data: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ... (Keep the rest of your adminPanel.js routes exactly the same) ...