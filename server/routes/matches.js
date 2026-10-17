const express = require('express');
const Match = require('../models/Match');
const { optionalAuth, protect } = require('../middleware/auth');
const { matchQueryValidation, matchIdValidation } = require('../middleware/validation');
const OddsService = require('../services/OddsService');

const router = express.Router();

// @route   GET /api/matches
// @desc    Get all matches with filtering
// @access  Public
router.get('/', optionalAuth, matchQueryValidation, async (req, res) => {
  try {
    const { 
      status, 
      league, 
      date, 
      search, 
      page = 1, 
      limit = 50,
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;
    
    let query = {};

    if (status && status !== 'ALL') {
      if (status === 'LIVE') {
        query.status = { $in: ['LIVE', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF'] };
      } else {
        query.status = status;
      }
    }
    
    if (league && league !== 'ALL') {
      query.league = league;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const matches = await Match.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Match.countDocuments(query);

    const leagues = await Match.distinct('league');

    if (req.user) {
      // Could track user views here
    }

    res.json({
      success: true,
      data: matches,
      filters: {
        leagues,
        total
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/live
// @desc    Get all live matches
// @access  Public
router.get('/live', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const liveMatches = await Match.find({
      status: { $in: ['LIVE', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF', 'EXTRA_TIME'] }
    })
      .select('homeTeam awayTeam score minute status league startsAt sport markets')
      .sort({ date: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: liveMatches.length,
      data: liveMatches
    });
  } catch (error) {
    console.error('Get live matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/upcoming
// @desc    Get upcoming matches
// @access  Public
router.get('/upcoming', async (req, res) => {
  try {
    const { days = 7, limit = 50 } = req.query;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    const matches = await Match.find({
      status: 'SCHEDULED',
      date: { $gte: startDate, $lte: endDate }
    })
      .sort({ date: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/popular
// @desc    Get popular matches (by views/bets)
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const matches = await Match.find({
      status: { $in: ['SCHEDULED', 'LIVE'] }
    })
      .sort({ views: -1, betCount: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    console.error('Get popular matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/leagues
// @desc    Get all leagues (with counts, not full docs)
// @access  Public
router.get('/leagues', async (req, res) => {
  try {
    const leagues = await Match.aggregate([
      { $group: { _id: '$league', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: leagues.map(l => ({ league: l._id, count: l.count }))
    });
  } catch (error) {
    console.error('Get leagues error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/:id
// @desc    Get single match
// @access  Public
router.get('/:id', matchIdValidation, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    match.views += 1;
    await match.save();

    const relatedMatches = await Match.find({
      league: match.league,
      _id: { $ne: match._id },
      status: 'SCHEDULED'
    })
      .limit(5)
      .sort({ date: 1 });

    res.json({
      success: true,
      data: {
        ...match.toJSON(),
        related: relatedMatches
      }
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/:id/odds
// @desc    Get match odds
// @access  Public
router.get('/:id/odds', matchIdValidation, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).select('markets status');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const oddsWithInfo = match.markets.map(market => {
      const impliedProb = OddsService.calculateImpliedProbability(market.odds);
      return {
        ...market.toJSON(),
        impliedProbability: impliedProb,
        available: match.isBettingAvailable() && market.isActive && !market.suspended
      };
    });

    res.json({
      success: true,
      data: {
        matchId: match._id,
        status: match.status,
        markets: oddsWithInfo,
        isBettingAvailable: match.isBettingAvailable()
      }
    });
  } catch (error) {
    console.error('Get odds error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/:id/stats
// @desc    Get match statistics
// @access  Public
router.get('/:id/stats', matchIdValidation, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).select('liveStats events score status');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const stats = {
      ...match.toJSON(),
      possession: match.liveStats?.possession,
      shots: {
        total: match.liveStats?.shots,
        onTarget: match.liveStats?.shotsOnTarget
      },
      cards: {
        yellow: match.liveStats?.yellowCards,
        red: match.liveStats?.redCards
      },
      timeline: match.events?.map(event => ({
        minute: event.minute,
        type: event.type,
        team: event.team,
        player: event.player,
        score: `${event.homeScore}-${event.awayScore}`
      }))
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/matches/:id/h2h
// @desc    Get head-to-head history
// @access  Public
router.get('/:id/h2h', matchIdValidation, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const h2h = await Match.find({
      $or: [
        { 'homeTeam.name': match.homeTeam.name, 'awayTeam.name': match.awayTeam.name },
        { 'homeTeam.name': match.awayTeam.name, 'awayTeam.name': match.homeTeam.name }
      ],
      status: 'FINISHED'
    })
      .sort({ date: -1 })
      .limit(10);

    const stats = {
      total: h2h.length,
      homeWins: 0,
      awayWins: 0,
      draws: 0,
      homeGoals: 0,
      awayGoals: 0
    };

    h2h.forEach(m => {
      const isHomeTeam = m.homeTeam.name === match.homeTeam.name;
      
      if (m.score.home > m.score.away) {
        if (isHomeTeam) stats.homeWins++;
        else stats.awayWins++;
      } else if (m.score.home < m.score.away) {
        if (isHomeTeam) stats.awayWins++;
        else stats.homeWins++;
      } else {
        stats.draws++;
      }

      if (isHomeTeam) {
        stats.homeGoals += m.score.home;
        stats.awayGoals += m.score.away;
      } else {
        stats.homeGoals += m.score.away;
        stats.awayGoals += m.score.home;
      }
    });

    res.json({
      success: true,
      data: {
        matches: h2h,
        stats
      }
    });
  } catch (error) {
    console.error('Get h2h error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;