const express = require('express');
const { protect } = require('../middleware/auth');
const { placeBetValidation, placeMultiBetValidation } = require('../middleware/validation');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const OddsService = require('../services/OddsService');

const router = express.Router();

// @route   POST /api/bets
// @desc    Place a single bet
// @access  Private
router.post('/', protect, placeBetValidation, async (req, res) => {
  try {
    const { matchId, marketIndex, stake } = req.body;

    // Validate match
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // ✅ CHANGED: Betting closure check with detailed reason
    if (!match.isBettingAvailable()) {
      return res.status(400).json({
        success: false,
        message:
          match.getBettingClosedReason() ||
          'Betting is not available for this match'
      });
    }

    // Validate market
    const market = match.markets[marketIndex];
    if (!market || !market.isActive || market.suspended) {
      return res.status(400).json({
        success: false,
        message: 'Market not available'
      });
    }

    // Validate stake against limits
    if (stake < market.minBet || stake > market.maxBet) {
      return res.status(400).json({
        success: false,
        message: `Stake must be between ${market.minBet} and ${market.maxBet}`
      });
    }

    // Check user balance and limits
    const user = await User.findById(req.user._id);
    const canBet = user.canBet(stake);
    if (!canBet.allowed) {
      return res.status(400).json({
        success: false,
        message: canBet.reason
      });
    }

    // Calculate potential win
    const potentialWin = OddsService.calculatePotentialWin(stake, market.odds);

    // Create bet
    const bet = await Bet.create({
      user: user._id,
      type: 'SINGLE',
      selections: [{
        match: match._id,
        marketIndex,
        marketName: market.name,
        odds: market.odds,
        oddsAtPlacement: market.odds,
        status: 'PENDING'
      }],
      totalOdds: market.odds,
      stake,
      potentialWin,
      currency: user.currency,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Update user balance
    user.balance -= stake;
    await user.save();

    // Create transaction
    await Transaction.create({
      user: user._id,
      type: 'BET_PLACED',
      amount: -stake,
      balance: {
        before: user.balance + stake,
        after: user.balance
      },
      status: 'COMPLETED',
      bet: bet._id,
      reference: bet.reference,
      description: `Bet placed on ${match.homeTeam.abbreviation} vs ${match.awayTeam.abbreviation}`
    });

    // Update match statistics
    market.volume += stake;
    market.betsCount += 1;
    match.betCount += 1;
    match.totalVolume += stake;
    await match.save();

    // Check if cashout is available
    bet.cashoutAvailable = await bet.checkCashoutAvailability();
    bet.cashoutValue = bet.calculateCashout();
    await bet.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`match-${match._id}`).emit('new-bet', {
      matchId: match._id,
      marketIndex,
      amount: stake,
      username: user.username
    });

    // Send to user's room
    io.to(`user-${user._id}`).emit('bet-placed', {
      betId: bet._id,
      stake,
      potentialWin
    });

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: {
        ...bet.toJSON(),
        newBalance: user.balance
      }
    });
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/bets/multi
// @desc    Place a multi bet
// @access  Private
router.post('/multi', protect, placeMultiBetValidation, async (req, res) => {
  try {
    const { selections, stake } = req.body;

    if (selections.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Multi bet requires at least 2 selections'
      });
    }

    if (selections.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 selections per bet'
      });
    }

    let totalOdds = 1;
    const betSelections = [];
    const matches = [];

    // Validate each selection
    for (const sel of selections) {
      const match = await Match.findById(sel.matchId);
      
      if (!match) {
        return res.status(404).json({
          success: false,
          message: `Match not found: ${sel.matchId}`
        });
      }

      // ✅ CHANGED: Betting closure check with detailed reason
      if (!match.isBettingAvailable()) {
        return res.status(400).json({
          success: false,
          message:
            match.getBettingClosedReason() ||
            `Betting not available for match ${match._id}`
        });
      }

      const market = match.markets[sel.marketIndex];
      if (!market || !market.isActive || market.suspended) {
        return res.status(400).json({
          success: false,
          message: `Market not available for match ${match._id}`
        });
      }

      betSelections.push({
        match: match._id,
        marketIndex: sel.marketIndex,
        marketName: market.name,
        odds: market.odds,
        oddsAtPlacement: market.odds,
        status: 'PENDING'
      });

      totalOdds *= market.odds;
      matches.push({ match, market, index: sel.marketIndex });
    }

    totalOdds = Number(totalOdds.toFixed(2));
    const potentialWin = OddsService.calculatePotentialWin(stake, totalOdds);

    // Check user balance
    const user = await User.findById(req.user._id);
    const canBet = user.canBet(stake);
    if (!canBet.allowed) {
      return res.status(400).json({
        success: false,
        message: canBet.reason
      });
    }

    // Create bet
    const bet = await Bet.create({
      user: user._id,
      type: 'MULTI',
      selections: betSelections,
      totalOdds,
      stake,
      potentialWin,
      currency: user.currency,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Update user balance
    user.balance -= stake;
    await user.save();

    // Create transaction
    await Transaction.create({
      user: user._id,
      type: 'BET_PLACED',
      amount: -stake,
      balance: {
        before: user.balance + stake,
        after: user.balance
      },
      status: 'COMPLETED',
      bet: bet._id,
      reference: bet.reference,
      description: `Multi bet with ${selections.length} selections`
    });

    // Update match statistics
    for (const { match, market, index } of matches) {
      market.volume += stake;
      market.betsCount += 1;
      match.betCount += 1;
      match.totalVolume += stake;
      await match.save();
    }

    // Check cashout
    bet.cashoutAvailable = await bet.checkCashoutAvailability();
    bet.cashoutValue = bet.calculateCashout();
    await bet.save();

    // Emit updates
    const io = req.app.get('io');
    matches.forEach(({ match }) => {
      io.to(`match-${match._id}`).emit('new-bet', {
        matchId: match._id,
        amount: stake,
        username: user.username
      });
    });

    io.to(`user-${user._id}`).emit('bet-placed', {
      betId: bet._id,
      stake,
      potentialWin
    });

    res.status(201).json({
      success: true,
      message: 'Multi bet placed successfully',
      data: {
        ...bet.toJSON(),
        newBalance: user.balance
      }
    });
  } catch (error) {
    console.error('Place multi bet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/bets/my-bets
// @desc    Get user's bets
// @access  Private
router.get('/my-bets', protect, async (req, res) => {
  try {
    const { 
      status, 
      type, 
      from, 
      to, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = { user: req.user._id };

    // Apply filters
    if (status) {
      if (status === 'ACTIVE') {
        query.status = { $in: ['PENDING'] };
      } else {
        query.status = status;
      }
    }
    
    if (type) query.type = type;
    
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get bets
    const bets = await Bet.find(query)
      .populate('selections.match', 'homeTeam awayTeam league date time status score')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Bet.countDocuments(query);

    // Calculate statistics
    const stats = {
      totalBets: await Bet.countDocuments({ user: req.user._id }),
      totalWon: await Bet.countDocuments({ user: req.user._id, status: 'WON' }),
      totalLost: await Bet.countDocuments({ user: req.user._id, status: 'LOST' }),
      totalPending: await Bet.countDocuments({ user: req.user._id, status: 'PENDING' }),
      totalStake: (await Bet.aggregate([
        { $match: { user: req.user._id } },
        { $group: { _id: null, total: { $sum: '$stake' } } }
      ]))[0]?.total || 0,
      totalWinnings: (await Bet.aggregate([
        { $match: { user: req.user._id, status: 'WON' } },
        { $group: { _id: null, total: { $sum: '$potentialWin' } } }
      ]))[0]?.total || 0
    };

    res.json({
      success: true,
      data: bets,
      stats: {
        totalBets: stats.totalBets,
        totalWon: stats.totalWon,
        totalLost: stats.totalLost,
        totalPending: stats.totalPending,
        totalStake: stats.totalStake,
        totalWinnings: stats.totalWinnings,
        winRate: stats.totalBets > 0 
          ? Number(((stats.totalWon / stats.totalBets) * 100).toFixed(2))
          : 0,
        profit: stats.totalWinnings - stats.totalStake
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get my bets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/bets/:id
// @desc    Get single bet
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('selections.match');

    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'Bet not found'
      });
    }

    // Update cashout availability
    bet.cashoutAvailable = await bet.checkCashoutAvailability();
    bet.cashoutValue = bet.calculateCashout();

    res.json({
      success: true,
      data: bet
    });
  } catch (error) {
    console.error('Get bet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/bets/:id/cashout
// @desc    Get cashout value
// @access  Private
router.get('/:id/cashout', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'PENDING'
    });

    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'Bet not found or not eligible for cashout'
      });
    }

    const cashoutValue = bet.calculateCashout();
    const available = cashoutValue > 0 && !bet.cashoutTaken;

    res.json({
      success: true,
      data: {
        betId: bet._id,
        cashoutValue,
        available
      }
    });
  } catch (error) {
    console.error('Get cashout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/bets/:id/cashout
// @desc    Cashout bet
// @access  Private
router.post('/:id/cashout', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'PENDING',
      cashoutAvailable: true,
      cashoutTaken: false
    });

    if (!bet) {
      return res.status(404).json({
        success: false,
        message: 'Bet not found or cashout not available'
      });
    }

    const cashoutValue = bet.calculateCashout();
    if (cashoutValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cashout not available at this time'
      });
    }

    // Update bet
    bet.cashoutTaken = true;
    bet.cashoutAmount = cashoutValue;
    bet.cashoutTime = new Date();
    bet.status = 'CASHED_OUT';
    await bet.save();

    // Update user balance
    const user = await User.findById(req.user._id);
    user.balance += cashoutValue;
    await user.save();

    // Create transaction
    await Transaction.create({
      user: user._id,
      type: 'CASHOUT',
      amount: cashoutValue,
      balance: {
        before: user.balance - cashoutValue,
        after: user.balance
      },
      status: 'COMPLETED',
      bet: bet._id,
      description: `Cashout for bet ${bet.reference}`
    });

    // Emit update
    const io = req.app.get('io');
    io.to(`user-${user._id}`).emit('cashout-completed', {
      betId: bet._id,
      amount: cashoutValue,
      newBalance: user.balance
    });

    res.json({
      success: true,
      message: 'Cashout successful',
      data: {
        betId: bet._id,
        cashoutValue,
        newBalance: user.balance
      }
    });
  } catch (error) {
    console.error('Cashout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;