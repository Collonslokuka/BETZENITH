// server/services/betSettlementService.js
const Bet = require('../models/Bet');
const User = require('../models/User');

/**
 * Settle all pending bets on a given match.
 * Call this after admin updates a match to FINISHED with a score.
 *
 * @param {string} matchId
 * @param {object} match - the finished match document
 * @param {object} io    - socket.io instance (optional)
 * @returns {object} summary
 */
async function settleBetsForMatch(matchId, match, io) {
  const bets = await Bet.find({ match: matchId, status: 'PENDING' });
  if (bets.length === 0) {
    return { settled: 0, won: 0, lost: 0, totalPaid: 0 };
  }

  // Determine the winning selections from the match result
  const winner = match.result?.winner; // 'HOME' | 'AWAY' | 'DRAW'
  const homeScore = match.score?.home ?? 0;
  const awayScore = match.score?.away ?? 0;
  const totalGoals = homeScore + awayScore;
  const btts = homeScore > 0 && awayScore > 0;

  // Map of which selection names win
  const winningSelections = new Set();

  // 1X2 / Home-Away markets
  if (winner === 'HOME') {
    winningSelections.add('1');
    winningSelections.add('Home');
  } else if (winner === 'AWAY') {
    winningSelections.add('2');
    winningSelections.add('Away');
  } else if (winner === 'DRAW') {
    winningSelections.add('X');
  }

  // Totals
  if (totalGoals > 2.5) {
    winningSelections.add('Over 2.5');
  } else {
    winningSelections.add('Under 2.5');
  }
  if (totalGoals > 0.5) winningSelections.add('Over 0.5');
  if (totalGoals > 1.5) winningSelections.add('Over 1.5');

  // BTTS
  if (btts) winningSelections.add('BTTS');
  else winningSelections.add('BTTS No');

  // Double chance
  if (winner === 'HOME' || winner === 'DRAW') winningSelections.add('Double Chance 1X');
  if (winner === 'HOME' || winner === 'AWAY') winningSelections.add('Double Chance 12');
  if (winner === 'DRAW' || winner === 'AWAY') winningSelections.add('Double Chance X2');

  let won = 0, lost = 0, totalPaid = 0;

  for (const bet of bets) {
    const selectionName = bet.selection || bet.market;
    const isWinner = winningSelections.has(selectionName);

    if (isWinner) {
      bet.status = 'WON';
      bet.settledAt = new Date();
      bet.payout = bet.potentialWin || Number((bet.stake * bet.odds).toFixed(2));

      // Credit the user's balance
      const user = await User.findById(bet.user);
      if (user) {
        const oldBalance = user.balance;
        user.balance = Number((oldBalance + bet.payout).toFixed(2));
        await user.save();

        // Emit socket event for real-time update
        if (io) {
          io.to(`user-${user._id}`).emit('balance-update', {
            newBalance: user.balance,
            amount: bet.payout,
            type: 'bet-won',
          });
          io.to(`user-${user._id}`).emit('bet-settled', {
            betId: bet._id,
            status: 'WON',
            payout: bet.payout,
            newBalance: user.balance,
          });
        }
      }

      totalPaid += bet.payout;
      won++;
    } else {
      bet.status = 'LOST';
      bet.settledAt = new Date();
      bet.payout = 0;
      lost++;

      const user = await User.findById(bet.user);
      if (io && user) {
        io.to(`user-${user._id}`).emit('bet-settled', {
          betId: bet._id,
          status: 'LOST',
          payout: 0,
        });
      }
    }

    await bet.save();
  }

  return { settled: bets.length, won, lost, totalPaid: Number(totalPaid.toFixed(2)) };
}

module.exports = { settleBetsForMatch };