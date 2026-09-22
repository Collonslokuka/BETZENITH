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
//  CREATE MATCH (with optional scripted final score)
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

    const marketSets = {
      soccer: [
        { name: '1', odds: 2.10, isActive: true },
        { name: 'X', odds: 3.40, isActive: true },
        { name: '2', odds: 2.10, isActive: true },
      ],
      basketball: [
        { name: 'Home', odds: 1.90, isActive: true },
        { name: 'Away', odds: 1.90, isActive: true },
      ],
      tennis: [
        { name: 'Home', odds: 1.85, isActive: true },
        { name: 'Away', odds: 1.95, isActive: true },
      ],
      default: [
        { name: '1', odds: 2.00, isActive: true },
        { name: 'X', odds: 3.20, isActive: true },
        { name: '2', odds: 2.00, isActive: true },
      ],
    };

    // Scripted outcome is set if BOTH target scores are provided
    const hasScript =
      finalHomeScore !== undefined && finalHomeScore !== '' &&
      finalAwayScore !== undefined && finalAwayScore !== '';

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
      markets: marketSets[sport] || marketSets.default,
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
      finalHomeScore, finalAwayScore,
    } = req.body;

    if (status) match.status = status;
    if (minute !== undefined) match.minute = Number(minute);
    if (startsAt) {
      const d = new Date(startsAt);
      if (!isNaN(d.getTime())) { match.startsAt = d; match.date = d; }
    }
    if (homeTeam) match.homeTeam.name = homeTeam;
    if (awayTeam) match.awayTeam.name = awayTeam;
    if (league) match.league = league;
    if (sport) match.sport = sport;

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