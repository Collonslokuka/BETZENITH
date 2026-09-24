// server/routes/adminPanel.js
const express = require('express');
const crypto = require('crypto');
const Match = require('../models/Match');
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

// Build the base markets array from home/draw/away odds
function buildMarkets(sport, odds = {}) {
  const h = Number(odds.home) || 2.10;
  const d = Number(odds.draw) || 3.40;
  const a = Number(odds.away) || 2.10;

  if (sport === 'soccer') {
    return [
      { name: '1', odds: h, isActive: true },
      { name: 'X', odds: d, isActive: true },
      { name: '2', odds: a, isActive: true },
    ];
  }
  return [
    { name: 'Home', odds: h, isActive: true },
    { name: 'Away', odds: a, isActive: true },
  ];
}

// Generate combination + correct-score markets for a soccer match
// from the base 1X2 odds. Called on create so the board is always full.
function generateExtendedMarkets(baseOdds) {
  const { home, draw, away } = baseOdds;

  const combos = [
    { name: '1 & Over 2.5',  odds: +(home * 2.04).toFixed(2), isActive: true },
    { name: '1 & Under 2.5', odds: +(home * 2.89).toFixed(2), isActive: true },
    { name: 'X & Over 2.5',  odds: +(draw * 1.29).toFixed(2), isActive: true },
    { name: 'X & Under 2.5', odds: +(draw * 1.83).toFixed(2), isActive: true },
    { name: '2 & Over 2.5',  odds: +(away * 2.04).toFixed(2), isActive: true },
    { name: '2 & Under 2.5', odds: +(away * 2.89).toFixed(2), isActive: true },
  ];

  const csBase = {
    '0:0': 6.62,  '0:1': 13.08, '0:2': 49.58, '0:3': 105.45, '0:4': 107.65,
    '1:0': 4.96,  '1:1': 6.20,  '1:2': 39.81, '1:3': 96.13,  '1:4': 94.22,
    '2:0': 17.69, '2:1': 14.65, '2:2': 19.41, '2:3': 104.04, '2:4': 105.47,
    '3:0': 56.99, '3:1': 50.88, '3:2': 48.51, '3:3': 108.56, '3:4': 108.64,
    '4:0': 72.88, '4:1': 72.00, '4:2': 90.00, '4:3': 100.00, '4:4': 150.00,
  };

  const homeTilt = 2.10 / Math.max(1.2, home);
  const awayTilt = 2.10 / Math.max(1.2, away);

  const correctScore = Object.entries(csBase).map(([name, odds]) => {
    const [h, a] = name.split(':').map(Number);
    let adj = 1;
    if (h > a) adj = homeTilt;
    else if (a > h) adj = awayTilt;
    return { name, odds: +(odds * adj).toFixed(2), isActive: true };
  });

  return [...combos, ...correctScore];
}

// Apply incoming odds onto an existing markets array (used by PUT)
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

// ============================================================
//  AUTH
// ============================================================
router.post('/login', (req, res) => {
  const { token } = req.body || {};
  if (token === ADMIN_TOKEN) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Wrong token' });
});

// ============================================================
//  LIST ALL MATCHES
// ============================================================
router.get('/matches', requireAdmin, async (req, res) => {
  try {
    const { sport, status, limit = 100 } = req.query;
    const query = {};
    if (sport) query.sport = sport;
    if (status) query.status = status;

    const matches = await Match.find(query)
      .sort({ startsAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: matches.length, data: matches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  CREATE MATCH (with optional scripted final score + odds)
// ============================================================
router.post('/matches', requireAdmin, async (req, res) => {
  try {
    const {
      sport = 'soccer',
      league,
      homeTeam,
      awayTeam,
      startsAt,
      finalHomeScore,
      finalAwayScore,
      odds = {},
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

    const baseMarkets = buildMarkets(sport, odds);
    const extended = sport === 'soccer'
      ? generateExtendedMarkets({
          home: Number(odds.home) || 2.10,
          draw: Number(odds.draw) || 3.40,
          away: Number(odds.away) || 2.10,
        })
      : [];

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
      markets: [...baseMarkets, ...extended],
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

// ============================================================
//  UPDATE MATCH
// ============================================================
router.put('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      status, score, minute, startsAt, homeTeam, awayTeam, league, sport,
      finalHomeScore, finalAwayScore, odds,
    } = req.body;

    if (status) match.status = status;
    if (minute !== undefined) match.minute = Number(minute);

    // NEW: only allow rescheduling while the match is still SCHEDULED
    if (startsAt) {
      if (match.status === 'SCHEDULED') {
        const d = new Date(startsAt);
        if (!isNaN(d.getTime())) {
          match.startsAt = d;
          match.date = d;
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Cannot change start time — match has already kicked off',
        });
      }
    }

    if (homeTeam) match.homeTeam.name = homeTeam;
    if (awayTeam) match.awayTeam.name = awayTeam;
    if (league) match.league = league;
    if (sport) match.sport = sport;

    // Update the base odds inside match.markets when supplied
    if (odds && (odds.home || odds.draw || odds.away)) {
      applyOddsToMarkets(match, odds);
    }

    // Case 1: explicit final score given -> set target
    if (finalHomeScore !== undefined && finalHomeScore !== '' &&
        finalAwayScore !== undefined && finalAwayScore !== '') {
      match.scriptedOutcome = {
        homeScore: Number(finalHomeScore),
        awayScore: Number(finalAwayScore),
      };
    }

    // Case 2: score posted while match is SCHEDULED or LIVE -> treat as target
    if (score && status !== 'FINISHED' &&
        ['SCHEDULED', 'LIVE', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF'].includes(match.status)) {
      match.scriptedOutcome = {
        homeScore: Number(score.home) || 0,
        awayScore: Number(score.away) || 0,
      };
    }

    // Case 3: score posted WITH status FINISHED -> finish immediately
    if (score && status === 'FINISHED') {
      match.score = { home: Number(score.home) || 0, away: Number(score.away) || 0 };
    }

    if (status === 'FINISHED') {
      match.finishedAt = new Date();
      match.result = {
        winner:
          match.score.home > match.score.away ? 'HOME'
          : match.score.away > match.score.home ? 'AWAY'
          : 'DRAW',
        score: match.score,
        isSettled: true,
        settledAt: new Date(),
      };
    }

    await match.save();

    // Settle bets if finished
    let settlement = null;
    if (status === 'FINISHED') {
      try {
        const { settleBetsForMatch } = require('../services/betSettlementService');
        const io = req.app.get('io');
        settlement = await settleBetsForMatch(match._id, match, io);
        console.log(`💰 Settlement: ${JSON.stringify(settlement)}`);
      } catch (err) {
        console.error('❌ Settlement error:', err.message);
      }
    }

    res.json({ success: true, data: match, settlement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  SET SCRIPTED OUTCOME (dedicated endpoint)
// ============================================================
router.post('/matches/:id/script', requireAdmin, async (req, res) => {
  try {
    const { homeScore, awayScore } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Not found' });

    match.scriptedOutcome = {
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
    };
    await match.save();

    res.json({ success: true, data: match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  DELETE MATCH
// ============================================================
router.delete('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const r = await Match.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  PREDICTION LINKS
// ============================================================
router.post('/matches/:id/predict', requireAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Not found' });

    const { predictedWinner, predictedScore, note } = req.body;

    const slug = crypto.randomBytes(6).toString('hex');
    predictionSlugs.set(slug, {
      matchId: String(match._id),
      predictedWinner: predictedWinner || 'HOME',
      predictedScore: predictedScore || '2-1',
      note: note || '',
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, slug, url: `/predict/${slug}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/predict/:slug', async (req, res) => {
  try {
    const p = predictionSlugs.get(req.params.slug);
    if (!p) return res.status(404).json({ success: false, message: 'Prediction not found or expired' });

    const match = await Match.findById(p.matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    res.json({
      success: true,
      data: {
        prediction: {
          predictedWinner: p.predictedWinner,
          predictedScore: p.predictedScore,
          note: p.note,
          issuedAt: p.createdAt,
        },
        match: {
          _id: match._id,
          sport: match.sport,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          startsAt: match.startsAt,
          status: match.status,
          score: match.score,
          minute: match.minute,
          result: match.result,
          markets: match.markets,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/predictions', requireAdmin, (req, res) => {
  const list = Array.from(predictionSlugs.entries()).map(([slug, p]) => ({ slug, ...p }));
  res.json({ success: true, count: list.length, data: list });
});

module.exports = router;