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

    // Full market catalog for the sport (or the odds the admin supplied)
    const markets = buildMarkets(sport, odds);

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

// ============ UPDATE ============
router.put('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      status, score, minute, startsAt, homeTeam, awayTeam, league, sport,
      finalHomeScore, finalAwayScore, odds,
      markets,
    } = req.body;

    if (status) match.status = status;
    if (minute !== undefined) match.minute = Number(minute);

    if (startsAt) {
      if (match.status === 'SCHEDULED') {
        const d = new Date(startsAt);
        if (!isNaN(d.getTime())) { match.startsAt = d; match.date = d; }
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

    if (odds && (odds.home || odds.draw || odds.away)) {
      applyOddsToMarkets(match, odds);
    }

    // Bulk-update every named market
    if (Array.isArray(markets)) {
      for (const incoming of markets) {
        if (!incoming?.name) continue;
        const idx = match.markets.findIndex(m => m.name === incoming.name);
        if (idx >= 0) {
          match.markets[idx].odds = Number(incoming.odds);
          if (incoming.isActive !== undefined) {
            match.markets[idx].isActive = !!incoming.isActive;
          }
        } else {
          match.markets.push({
            name: incoming.name,
            odds: Number(incoming.odds),
            isActive: incoming.isActive !== false,
          });
        }
      }
    }

    if (finalHomeScore !== undefined && finalHomeScore !== '' &&
        finalAwayScore !== undefined && finalAwayScore !== '') {
      match.scriptedOutcome = {
        homeScore: Number(finalHomeScore),
        awayScore: Number(finalAwayScore),
      };
    }

    if (score && status !== 'FINISHED' &&
        ['SCHEDULED', 'LIVE', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF'].includes(match.status)) {
      match.scriptedOutcome = {
        homeScore: Number(score.home) || 0,
        awayScore: Number(score.away) || 0,
      };
    }

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

// ============ SCRIPT ============
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

// ============ DELETE ============
router.delete('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const r = await Match.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ PREDICTION LINKS ============
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