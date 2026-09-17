// server/routes/aiMatches.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Match = require('../models/Match');
const aiMatchService = require('../services/aiMatchService');

// ============================================================
//  SCHEDULED MATCHES — for pre-match betting
// ============================================================

// @route   GET /api/ai-matches/scheduled
// @desc    All upcoming scheduled matches
// @access  Public
router.get('/scheduled', async (req, res) => {
  try {
    const { league, sport, page = 1, limit = 50 } = req.query;

    const query = {
      status: 'SCHEDULED',
      startsAt: { $gt: new Date() },
    };
    if (league) query.league = league;
    if (sport) query.sport = sport;

    const matches = await Match.find(query)
      .sort({ startsAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Match.countDocuments(query);

    res.json({
      success: true,
      count: matches.length,
      data: matches,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching scheduled matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/scheduled/by-date
// @desc    Group scheduled matches by date
// @access  Public
router.get('/scheduled/by-date', async (req, res) => {
  try {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const matches = await Match.find({
      status: 'SCHEDULED',
      startsAt: { $gte: now, $lte: endDate },
    }).sort({ startsAt: 1 });

    const grouped = matches.reduce((acc, match) => {
      const key = new Date(match.startsAt).toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    }, {});

    const groupedArray = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, arr]) => ({
        date,
        label: formatDateLabel(date),
        count: arr.length,
        matches: arr,
      }));

    res.json({
      success: true,
      totalMatches: matches.length,
      data: groupedArray,
    });
  } catch (error) {
    console.error('Error grouping scheduled matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================
//  EXISTING ROUTES
// ============================================================

// @route   GET /api/ai-matches/all
// @desc    Get all matches with AI predictions
router.get('/all', async (req, res) => {
  try {
    const { status, league, page = 1, limit = 50 } = req.query;
    let query = {};

    if (status && status !== 'ALL') {
      if (status === 'LIVE') {
        query.status = { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] };
      } else {
        query.status = status;
      }
    }
    if (league) query.league = league;

    const matches = await Match.find(query)
      .sort({ startsAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Match.countDocuments(query);

    res.json({
      success: true,
      data: matches,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/live
router.get('/live', async (req, res) => {
  try {
    const matches = await Match.find({
      status: { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] },
    }).sort({ minute: -1 });

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const matches = await Match.find({
      status: 'SCHEDULED',
      startsAt: { $gt: new Date() },
    })
      .sort({ startsAt: 1 })
      .limit(50);

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/finished
router.get('/finished', async (req, res) => {
  try {
    const matches = await Match.find({
      status: 'FINISHED',
    })
      .sort({ startsAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error('Error fetching finished matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/prediction/:matchId
router.get('/prediction/:matchId', async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    res.json({
      success: true,
      data: {
        matchId: match._id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        prediction:
          match.aiPrediction ||
          (await aiMatchService.calculateAIPrediction(match)),
        status: match.status,
        score: match.score,
        minute: match.minute,
      },
    });
  } catch (error) {
    console.error('Error fetching prediction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/league/:leagueName
router.get('/league/:leagueName', async (req, res) => {
  try {
    const { leagueName } = req.params;
    const { status } = req.query;

    let query = { league: decodeURIComponent(leagueName) };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const matches = await Match.find(query).sort({ startsAt: 1 });

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error('Error fetching league matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/ai-matches/stats/:matchId
router.get('/stats/:matchId', async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const stats = {
      possession: match.liveStats?.possession || { home: 50, away: 50 },
      shots: match.liveStats?.shots || { home: 0, away: 0 },
      shotsOnTarget: match.liveStats?.shotsOnTarget || { home: 0, away: 0 },
      corners: match.liveStats?.corners || { home: 0, away: 0 },
      fouls: match.liveStats?.fouls || { home: 0, away: 0 },
      yellowCards: match.liveStats?.yellowCards || { home: 0, away: 0 },
      redCards: match.liveStats?.redCards || { home: 0, away: 0 },
      events: match.events || [],
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching match stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/ai-matches/admin/start-service
router.post('/admin/start-service', async (req, res) => {
  try {
    aiMatchService.start();
    res.json({ success: true, message: 'AI Match Service started' });
  } catch (error) {
    console.error('Error starting service:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/ai-matches/admin/stop-service
router.post('/admin/stop-service', async (req, res) => {
  try {
    aiMatchService.stop();
    res.json({ success: true, message: 'AI Match Service stopped' });
  } catch (error) {
    console.error('Error stopping service:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;