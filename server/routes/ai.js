// server/routes/ai.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiPredictionService = require('../services/aiPredictionService');

// Public AI endpoints (no auth required)
router.get('/prediction/:matchId', async (req, res) => {
  try {
    const prediction = await aiPredictionService.getMatchPrediction(
      req.params.matchId,
      null // No user ID = public prediction
    );
    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error('AI prediction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Personalized AI endpoint (requires auth)
router.get('/personalized-prediction/:matchId', protect, async (req, res) => {
  try {
    const prediction = await aiPredictionService.getMatchPrediction(
      req.params.matchId,
      req.user._id
    );
    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error('Personalized AI prediction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Betting trends with optional auth
router.get('/trends', async (req, res) => {
  try {
    // Check if user is authenticated
    let userId = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        // Invalid token, treat as public
      }
    }

    const trends = await aiPredictionService.getBettingTrends(userId);
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI recommendation for bet slip (requires auth)
router.post('/bet-slip-recommendation', protect, async (req, res) => {
  try {
    const { selections, totalOdds, totalStake } = req.body;

    // Calculate probability
    const winProbability = (1 / totalOdds) * 100;
    const confidenceLevel = winProbability > 20 ? 'High' : winProbability > 10 ? 'Medium' : 'Low';

    // Get user stats for personalized recommendation
    const userStats = await aiPredictionService.getUserStats(req.user._id);

    const recommendation = {
      probability: winProbability.toFixed(1),
      confidence: confidenceLevel,
      message: getRecommendationMessage(winProbability, userStats.winRate),
      riskLevel: winProbability > 20 ? 'Low' : winProbability > 10 ? 'Medium' : 'High',
      suggestedStake: suggestStake(req.user.balance, winProbability),
      userInsight: `Your personal win rate is ${userStats.winRate}%. ${getComparisonMessage(winProbability, userStats.winRate)}`
    };

    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Bet slip recommendation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function getRecommendationMessage(probability, userWinRate) {
  if (probability > 20) {
    return "🎯 Good value! This accumulator has a high probability of winning.";
  } else if (probability > 10) {
    return "📊 Moderate risk. Consider hedging with smaller stake.";
  } else {
    return "⚠️ High risk accumulator. Consider reducing selections.";
  }
}

function suggestStake(balance, probability) {
  const maxStake = balance * 0.1;
  const suggestedPercent = probability > 20 ? 0.08 : probability > 10 ? 0.05 : 0.02;
  return Math.min(5000, Math.max(100, maxStake * suggestedPercent));
}

function getComparisonMessage(probability, userWinRate) {
  if (probability > userWinRate) {
    return "This bet has better odds than your average win! 🔥";
  } else if (probability < userWinRate * 0.5) {
    return "This is riskier than your typical winning bets.";
  } else {
    return "Similar to bets you've won before.";
  }
}

module.exports = router;