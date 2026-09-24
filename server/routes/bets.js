const express = require('express');
const { protect } = require('../middleware/auth');
const { placeBetValidation, placeMultiBetValidation } = require('../middleware/validation');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const OddsService = require('../services/OddsService');

const router = express.Router();

// ─── Helper: is the bet currently in a winning position? ───
// Used to deny cashout when the user's pick is losing.
// Handles 1X2, Home/Away, BTTS, and Over/Under X.5 markets.
function isBetWinning(bet) {
  for (const sel of bet.selections || []) {
    const m = sel.match;
    if (!m || !m.score) continue;

    const h = m.score.home ?? 0;
    const a = m.score.away ?? 0;
    const total = h + a;
    const market = (sel.marketName || '').trim();

    // 1X2 / Home / Away
    if (market === '1' || market === 'Home') { if (h <= a) return false; continue; }
    if (market === '2' || market === 'Away') { if (a <= h) return false; continue; }
    if (market === 'X') { if (h !== a) return false; continue; }

    // Both Teams To Score
    if (market === 'BTTS') { if (!(h > 0 && a > 0)) return false; continue; }
    if (market === 'BTTS No') { if (h > 0 && a > 0) return false; continue; }

    // Over / Under X.5 (numeric totals)
    const overMatch = market.match(/^Over\s+(\d+(?:\.\d+)?)$/i);
    if (overMatch) { if (!(total > parseFloat(overMatch[1]))) return false; continue; }

    const underMatch = market.match(/^Under\s+(\d+(?:\.\d+)?)$/i);
    if (underMatch) { if (!(total < parseFloat(underMatch[1]))) return false; continue; }

    // Other markets (correct score, combos, etc.) — can't judge from score alone,
    // so we treat as neutral (allow cashout).
  }
  return true;
}

// @route   POST /api/bets
// @desc    Place a single bet
// @access  Private
router.post('/', protect, placeBetValidation, async (req, res) => {
  try {
    const { matchId, marketIndex, stake } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!match.isBettingAvailable()) {
      return res.status(400).json({
        success: false,
        message: match.getBettingClosedReason() || 'Betting is not available for this match'
      });
    }

    const market = match.markets[marketIndex];
    if (!market || !market.isActive || market.suspended) {
      return res.status(400).json({ success: false, message: 'Market not available' });
    }

    if (stake < market.minBet || stake > market.maxBet) {
      return res.status(400).json({
        success: false,
        message: `Stake must be between ${market.minBet} and ${market.maxBet}`
      });
    }

    const user = await User.findById(req.user._id);
    const canBet = user.canBet(stake);
    if (!canBet.allowed) {
      return res.status(400).json({ success: false, message: canBet.reason });
    }

    const potentialWin = OddsService.calculatePotentialWin(stake, market.odds);

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

    user.balance -= stake;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'BET_PLACED',
      amount: -stake,
      balance: { before: user.balance + stake, after: user.balance },
      status: 'COMPLETED',
      bet: bet._id,
      reference: bet.reference,
      description: `Bet placed on ${match.homeTeam.abbreviation} vs ${match.awayTeam.abbreviation}`
    });

    market.volume += stake;
    market.betsCount += 1;
    match.betCount += 1;
    match.totalVolume += stake;
    await match.save();

    bet.cashoutAvailable = await bet.checkCashoutAvailability();
    bet.cashoutValue = bet.calculateCashout();
    await bet.save();

    const io = req.app.get('io');
    io.to(`match-${match._id}`).emit('new-bet', {
      matchId: match._id,
      marketIndex,
      amount: stake,
      username: user.username
    });
    io.to(`user-${user._id}`).emit('bet-placed', {
      betId: bet._id,
      stake,
      potentialWin
    });

    res.status(201).json({
      success: true,
      message: 'Bet placed successfully',
      data: { ...bet.toJSON(), newBalance: user.balance }
    });
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/bets/multi
router.post('/multi', protect, placeMultiBetValidation, async (req, res) => {
  try {
    const { selections, stake } = req.body;

    if (selections.length < 2) {
      return res.status(400).json({ success: false, message: 'Multi bet requires at least 2 selections' });
    }
    if (selections.length > 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 selections per bet' });
    }

    let totalOdds = 1;
    const betSelections = [];
    const matches = [];

    for (const sel of selections) {
      const match = await Match.findById(sel.matchId);
      if (!match) {
        return res.status(404).json({ success: false, message: `Match not found: ${sel.matchId}` });
      }
      if (!match.isBettingAvailable()) {
        return res.status(400).json({
          success: false,
          message: match.getBettingClosedReason() || `Betting not available for match ${match._id}`
        });
      }
      const market = match.markets[sel.marketIndex];
      if (!market || !market.isActive || market.suspended) {
        return res.status(400).json({ success: false, message: `Market not available for match ${match._id}` });
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

    const user = await User.findById(req.user._id);
    const canBet = user.canBet(stake);
    if (!canBet.allowed) {
      return res.status(400).json({ success: false, message: canBet.reason });
    }

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

    user.balance -= stake;
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'BET_PLACED',
      amount: -stake,
      balance: { before: user.balance + stake, after: user.balance },
      status: 'COMPLETED',
      bet: bet._id,
      reference: bet.reference,
      description: `Multi bet with ${selections.length} selections`
    });

    for (const { match, market } of matches) {
      market.volume += stake;
      market.betsCount += 1;
      match.betCount += 1;
      match.totalVolume += stake;
      await match.save();
    }

    bet.cashoutAvailable = await bet.checkCashoutAvailability();
    bet.cashoutValue = bet.calculateCashout();
    await bet.save();

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
      data: { ...bet.toJSON(), newBalance: user.balance }
    });
  } catch (error) {
    console.error('Place multi bet error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/bets/my-bets
router.get('/my-bets', protect, async (req, res) => {
  try {
    const {
      status, type, from, to,
      page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    let query = { user: req.user._id };

    if (status) {
      if (status === 'ACTIVE') query.status = { $in: ['PENDING'] };
      else query.status = status;
    }
    if (type) query.type = type;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const bets = await Bet.find(query)
      .populate('selections.match', 'homeTeam awayTeam league date time startsAt status score minute')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Bet.countDocuments(query);

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
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/bets/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('selections.match');

    if (!bet) {
      return res.status(404).json({ success: false, message: 'Bet not found' });
    }

    bet.cashoutAvailable = await bet.checkCashoutAvailability();
    bet.cashoutValue = bet.calculateCashout();

    res.json({ success: true, data: bet });
  } catch (error) {
    console.error('Get bet error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/bets/:id/cancel
// @desc    Cancel a pending bet before kickoff — refunds full stake
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'PENDING'
    }).populate('selections.match');

    if (!bet) {
      return res.status(404).json({ success: false, message: 'Bet not found or not cancellable' });
    }

    const now = new Date();
    for (const sel of bet.selections) {
      const m = sel.match;
      if (!m) {
        return res.status(400).json({ success: false, message: 'Match data missing' });
      }
      if (m.status !== 'SCHEDULED') {
        return res.status(400).json({ success: false, message: 'Cannot cancel — match has already started' });
      }
      if (new Date(m.startsAt) <= now) {
        return res.status(400).json({ success: false, message: 'Cannot cancel — kick-off time has passed' });
      }
    }

    const user = await User.findById(req.user._id);
    const refund = Number(bet.stake) || 0;
    user.balance = Number((user.balance + refund).toFixed(2));
    await user.save();

    bet.status = 'CANCELLED';
    bet.cancelledAt = new Date();
    bet.cancelReason = 'User cancelled before kick-off';
    await bet.save();

    await Transaction.create({
      user: user._id,
      type: 'BET_CANCELLED',
      amount: refund,
      balance: { before: user.balance - refund, after: user.balance },
      status: 'COMPLETED',
      bet: bet._id,
      reference: bet.reference,
      description: 'Bet cancelled — stake refunded'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user._id}`).emit('bet-cancelled', {
        betId: bet._id,
        refunded: refund,
        newBalance: user.balance
      });
    }

    res.json({
      success: true,
      message: 'Bet cancelled',
      data: { refunded: refund, newBalance: user.balance }
    });
  } catch (error) {
    console.error('Cancel bet error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/bets/:id/cashout
router.get('/:id/cashout', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'PENDING'
    }).populate('selections.match');

    if (!bet) {
      return res.status(404).json({ success: false, message: 'Bet not found or not eligible for cashout' });
    }

    const winning = isBetWinning(bet);
    const cashoutValue = bet.calculateCashout();
    const available = winning && cashoutValue > 0 && !bet.cashoutTaken;

    res.json({
      success: true,
      data: { betId: bet._id, cashoutValue, available }
    });
  } catch (error) {
    console.error('Get cashout error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/bets/:id/cashout
// @desc    Cash out a live pending bet (denied if the bet is currently losing)
router.post('/:id/cashout', protect, async (req, res) => {
  try {
    const bet = await Bet.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'PENDING',
      cashoutTaken: false
    }).populate('selections.match');

    if (!bet) {
      return res.status(404).json({ success: false, message: 'Bet not found or cashout not available' });
    }

    if (!isBetWinning(bet)) {
      return res.status(400).json({
        success: false,
        message: 'Cashout denied — your bet is currently in a losing position'
      });
    }

    const cashoutValue = bet.calculateCashout();
    if (!cashoutValue || cashoutValue <= 0) {
      return res.status(400).json({ success: false, message: 'Cashout not available at this time' });
    }

    bet.cashoutTaken = true;
    bet.cashoutAmount = cashoutValue;
    bet.cashoutTime = new Date();
    bet.status = 'CASHED_OUT';
    await bet.save();

    const user = await User.findById(req.user._id);
    user.balance = Number((user.balance + cashoutValue).toFixed(2));
    await user.save();

    await Transaction.create({
      user: user._id,
      type: 'CASHOUT',
      amount: cashoutValue,
      balance: { before: user.balance - cashoutValue, after: user.balance },
      status: 'COMPLETED',
      bet: bet._id,
      description: `Cashout for bet ${bet.reference}`
    });

    const io = req.app.get('io');
    io.to(`user-${user._id}`).emit('cashout-completed', {
      betId: bet._id,
      amount: cashoutValue,
      newBalance: user.balance
    });

    res.json({
      success: true,
      message: 'Cashout successful',
      data: { betId: bet._id, cashoutValue, newBalance: user.balance }
    });
  } catch (error) {
    console.error('Cashout error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;