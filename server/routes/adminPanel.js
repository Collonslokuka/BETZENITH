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

function generateExtendedMarkets(baseOdds) {
  const { home: H, draw: D, away: A } = baseOdds;

  const invH = 1 / H, invD = 1 / D, invA = 1 / A;
  const tot = invH + invD + invA;
  const pH = invH / tot, pD = invD / tot, pA = invA / tot;

  const toOdds = (p) => Math.max(1.01, +(1 / Math.max(p, 0.001)).toFixed(2));

  function poissonOver(lambda, line) {
    let p = Math.exp(-lambda);
    let sum = p;
    const n = Math.ceil(line + 0.5);
    for (let k = 1; k < n; k++) {
      p = (p * lambda) / k;
      sum += p;
    }
    return Math.max(0.01, Math.min(0.99, 1 - sum));
  }

  const LAMBDA = 2.7;
  const LAMBDA_1H = LAMBDA * 0.45;

  const totals = [];
  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5].forEach(line => {
    const pOver = poissonOver(LAMBDA, line);
    totals.push({ name: `Over ${line}`,  odds: toOdds(pOver),     isActive: true });
    totals.push({ name: `Under ${line}`, odds: toOdds(1 - pOver), isActive: true });
  });

  const pBtts = Math.min(0.75, 0.55 + 0.10 * (1 - Math.abs(pH - pA)));
  const btts = [
    { name: 'BTTS',    odds: toOdds(pBtts),     isActive: true },
    { name: 'BTTS No', odds: toOdds(1 - pBtts), isActive: true },
  ];

  const combos1x2Btts = [
    { name: '1 & BTTS',    odds: toOdds(pH * pBtts * 0.75),       isActive: true },
    { name: '1 & BTTS No', odds: toOdds(pH * (1 - pBtts) * 1.25), isActive: true },
    { name: 'X & BTTS',    odds: toOdds(pD * pBtts * 1.10),       isActive: true },
    { name: 'X & BTTS No', odds: toOdds(pD * (1 - pBtts) * 1.10), isActive: true },
    { name: '2 & BTTS',    odds: toOdds(pA * pBtts * 0.75),       isActive: true },
    { name: '2 & BTTS No', odds: toOdds(pA * (1 - pBtts) * 1.25), isActive: true },
  ];

  const pOver25 = poissonOver(LAMBDA, 2.5);
  const pUnder25 = 1 - pOver25;
  const combos1x2Total = [
    { name: '1 & Over 2.5',  odds: toOdds(pH * pOver25 * 1.25),  isActive: true },
    { name: '1 & Under 2.5', odds: toOdds(pH * pUnder25 * 1.55), isActive: true },
    { name: 'X & Over 2.5',  odds: toOdds(pD * pOver25 * 1.55),  isActive: true },
    { name: 'X & Under 2.5', odds: toOdds(pD * pUnder25 * 1.40), isActive: true },
    { name: '2 & Over 2.5',  odds: toOdds(pA * pOver25 * 1.25),  isActive: true },
    { name: '2 & Under 2.5', odds: toOdds(pA * pUnder25 * 1.55), isActive: true },
  ];

  const csBase = {
    '0:0': 0.11, '0:1': 0.07, '0:2': 0.025, '0:3': 0.006, '0:4': 0.0015,
    '1:0': 0.15, '1:1': 0.13, '1:2': 0.05,  '1:3': 0.012, '1:4': 0.0025,
    '2:0': 0.09, '2:1': 0.11, '2:2': 0.06,  '2:3': 0.018, '2:4': 0.004,
    '3:0': 0.04, '3:1': 0.05, '3:2': 0.03,  '3:3': 0.012, '3:4': 0.003,
    '4:0': 0.015,'4:1': 0.02, '4:2': 0.015, '4:3': 0.006, '4:4': 0.0015,
  };
  const hTilt = 1 + (pH - 0.33) * 1.2;
  const aTilt = 1 + (pA - 0.33) * 1.2;
  const correctScore = Object.entries(csBase).map(([name, p]) => {
    const [h, a] = name.split(':').map(Number);
    let adj = 1;
    if (h > a) adj = hTilt;
    else if (a > h) adj = aTilt;
    return { name, odds: toOdds(Math.min(0.6, p * adj)), isActive: true };
  });
  correctScore.push({ name: 'Other', odds: toOdds(0.04), isActive: true });

  const pH1 = Math.min(0.95, Math.sqrt(pH) * 0.6 + pH * 0.4);
  const pD1 = 0.34;
  const pA1 = Math.max(0.02, 1 - pH1 - pD1);
  const htft = [
    ['1','1', pH1 * pH * 1.55], ['1','X', pH1 * pD * 4.0], ['1','2', pH1 * pA * 8.0],
    ['X','1', pD1 * pH * 5.0 ], ['X','X', pD1 * pD * 2.2], ['X','2', pD1 * pA * 5.0],
    ['2','1', pA1 * pH * 8.0 ], ['2','X', pA1 * pD * 4.0], ['2','2', pA1 * pA * 1.55],
  ].map(([ht, ft, p]) => ({ name: `${ht}/${ft}`, odds: toOdds(p), isActive: true }));

  const oneH = [];
  oneH.push({ name: '1H 1', odds: toOdds(pH1), isActive: true });
  oneH.push({ name: '1H X', odds: toOdds(pD1), isActive: true });
  oneH.push({ name: '1H 2', odds: toOdds(pA1), isActive: true });

  [0.5, 1.5, 2.5].forEach(line => {
    const pOver = poissonOver(LAMBDA_1H, line);
    oneH.push({ name: `1H Over ${line}`,  odds: toOdds(pOver),     isActive: true });
    oneH.push({ name: `1H Under ${line}`, odds: toOdds(1 - pOver), isActive: true });
  });

  const pBtts1H = pBtts * 0.35;
  oneH.push({ name: '1H BTTS',    odds: toOdds(pBtts1H),     isActive: true });
  oneH.push({ name: '1H BTTS No', odds: toOdds(1 - pBtts1H), isActive: true });

  const cs1H = {
    '0:0': 0.35, '0:1': 0.12, '0:2': 0.03,
    '1:0': 0.20, '1:1': 0.10, '1:2': 0.03,
    '2:0': 0.05, '2:1': 0.04, '2:2': 0.02,
  };
  Object.entries(cs1H).forEach(([name, p]) => {
    oneH.push({ name: `1H ${name}`, odds: toOdds(p), isActive: true });
  });
  oneH.push({ name: '1H Other', odds: toOdds(0.06), isActive: true });

  return [
    ...totals,
    ...btts,
    ...combos1x2Btts,
    ...combos1x2Total,
    ...correctScore,
    ...htft,
    ...oneH,
  ];
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

// ============ UPDATE ============
router.put('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      status, score, minute, startsAt, homeTeam, awayTeam, league, sport,
      finalHomeScore, finalAwayScore, odds,
      markets,   // ← NEW
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

    // ── NEW: bulk-update every named market ──
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