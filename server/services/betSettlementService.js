// server/services/betSettlementService.js
const Bet = require('../models/Bet');
const User = require('../models/User');

/**
 * Determine HT score from events (goals on or before minute 45).
 */
function deriveHalfTimeScore(match) {
  let home = 0, away = 0;
  for (const ev of (match.events || [])) {
    if (ev.type === 'GOAL' && (ev.minute ?? 0) <= 45) {
      if (ev.team === 'home') home++;
      else if (ev.team === 'away') away++;
    }
  }
  return { home, away };
}

/**
 * Judge a single market name against the match context.
 * Returns 'WON' | 'LOST' | 'VOID'.
 */
function evaluateMarket(name, ctx) {
  if (!name) return 'VOID';
  const n = String(name).trim();
  const { ftHome, ftAway, ftWinner, ftTotal, ftBtts,
          htHome, htAway, htWinner, htTotal, htBtts } = ctx;

  if (n === '1' || n === 'Home') return ftWinner === 'HOME' ? 'WON' : 'LOST';
  if (n === '2' || n === 'Away') return ftWinner === 'AWAY' ? 'WON' : 'LOST';
  if (n === 'X')                 return ftWinner === 'DRAW' ? 'WON' : 'LOST';

  if (n === 'Double Chance 1X') return (ftWinner === 'HOME' || ftWinner === 'DRAW') ? 'WON' : 'LOST';
  if (n === 'Double Chance 12') return (ftWinner === 'HOME' || ftWinner === 'AWAY') ? 'WON' : 'LOST';
  if (n === 'Double Chance X2') return (ftWinner === 'DRAW' || ftWinner === 'AWAY') ? 'WON' : 'LOST';

  if (n === 'DNB 1') return ftWinner === 'HOME' ? 'WON' : 'LOST';
  if (n === 'DNB 2') return ftWinner === 'AWAY' ? 'WON' : 'LOST';

  let m;
  if ((m = n.match(/^Over\s+([\d.]+)$/)))  return ftTotal > Number(m[1]) ? 'WON' : 'LOST';
  if ((m = n.match(/^Under\s+([\d.]+)$/))) return ftTotal < Number(m[1]) ? 'WON' : 'LOST';

  if (n === 'BTTS')    return ftBtts ? 'WON' : 'LOST';
  if (n === 'BTTS No') return !ftBtts ? 'WON' : 'LOST';

  if ((m = n.match(/^([1X2]) & BTTS$/))) {
    const sideWon = (m[1] === '1' && ftWinner === 'HOME') || (m[1] === 'X' && ftWinner === 'DRAW') || (m[1] === '2' && ftWinner === 'AWAY');
    return sideWon && ftBtts ? 'WON' : 'LOST';
  }
  if ((m = n.match(/^([1X2]) & BTTS No$/))) {
    const sideWon = (m[1] === '1' && ftWinner === 'HOME') || (m[1] === 'X' && ftWinner === 'DRAW') || (m[1] === '2' && ftWinner === 'AWAY');
    return sideWon && !ftBtts ? 'WON' : 'LOST';
  }

  if ((m = n.match(/^([1X2]) & (Over|Under)\s+([\d.]+)$/))) {
    const sideWon = (m[1] === '1' && ftWinner === 'HOME') || (m[1] === 'X' && ftWinner === 'DRAW') || (m[1] === '2' && ftWinner === 'AWAY');
    const line = Number(m[3]);
    const totalWon = m[2] === 'Over' ? ftTotal > line : ftTotal < line;
    return sideWon && totalWon ? 'WON' : 'LOST';
  }

  if (/^\d+:\d+$/.test(n)) {
    const [h, a] = n.split(':').map(Number);
    return (h === ftHome && a === ftAway) ? 'WON' : 'LOST';
  }
  if (n === 'Other') {
    const listed = new Set();
    for (let h = 0; h <= 4; h++) for (let a = 0; a <= 4; a++) listed.add(`${h}:${a}`);
    return listed.has(`${ftHome}:${ftAway}`) ? 'LOST' : 'WON';
  }

  if ((m = n.match(/^([1X2])\/([1X2])$/))) {
    const htWon = (m[1] === '1' && htWinner === 'HOME') || (m[1] === 'X' && htWinner === 'DRAW') || (m[1] === '2' && htWinner === 'AWAY');
    const ftWon = (m[2] === '1' && ftWinner === 'HOME') || (m[2] === 'X' && ftWinner === 'DRAW') || (m[2] === '2' && ftWinner === 'AWAY');
    return htWon && ftWon ? 'WON' : 'LOST';
  }

  if (n === '1H 1') return htWinner === 'HOME' ? 'WON' : 'LOST';
  if (n === '1H X') return htWinner === 'DRAW' ? 'WON' : 'LOST';
  if (n === '1H 2') return htWinner === 'AWAY' ? 'WON' : 'LOST';

  if ((m = n.match(/^1H Over\s+([\d.]+)$/)))  return htTotal > Number(m[1]) ? 'WON' : 'LOST';
  if ((m = n.match(/^1H Under\s+([\d.]+)$/))) return htTotal < Number(m[1]) ? 'WON' : 'LOST';

  if (n === '1H BTTS')    return htBtts ? 'WON' : 'LOST';
  if (n === '1H BTTS No') return !htBtts ? 'WON' : 'LOST';

  if ((m = n.match(/^1H (\d+):(\d+)$/))) {
    const h = Number(m[1]), a = Number(m[2]);
    return (h === htHome && a === htAway) ? 'WON' : 'LOST';
  }
  if (n === '1H Other') {
    const listed = new Set(['0:0','0:1','0:2','1:0','1:1','1:2','2:0','2:1','2:2']);
    return listed.has(`${htHome}:${htAway}`) ? 'LOST' : 'WON';
  }

  return 'VOID';
}

/**
 * Settle all pending bets for a match.
 */
async function settleBetsForMatch(matchId, match, io) {
  const bets = await Bet.find({
    status: 'PENDING',
    'selections.match': matchId
  });

  if (bets.length === 0) {
    return { settled: 0, won: 0, lost: 0, voided: 0, totalPaid: 0 };
  }

  const ftHome = match.score?.home ?? 0;
  const ftAway = match.score?.away ?? 0;
  const ftWinner = ftHome > ftAway ? 'HOME' : ftAway > ftHome ? 'AWAY' : 'DRAW';
  const ftTotal = ftHome + ftAway;
  const ftBtts = ftHome > 0 && ftAway > 0;

  const ht = deriveHalfTimeScore(match);
  const htWinner = ht.home > ht.away ? 'HOME' : ht.away > ht.home ? 'AWAY' : 'DRAW';
  const htTotal = ht.home + ht.away;
  const htBtts = ht.home > 0 && ht.away > 0;

  const ctx = { ftHome, ftAway, ftWinner, ftTotal, ftBtts,
                htHome: ht.home, htAway: ht.away, htWinner, htTotal, htBtts };

  let won = 0, lost = 0, voided = 0, totalPaid = 0;

  for (const bet of bets) {
    for (const sel of (bet.selections || [])) {
      if (String(sel.match) !== String(matchId)) continue;
      const name = sel.marketName || sel.selection || sel.market;
      const verdict = evaluateMarket(name, ctx);
      sel.status = verdict;
      sel.settledAt = new Date();
    }

    const allResolved = (bet.selections || []).every(s => s.status && s.status !== 'PENDING');
    if (!allResolved) {
      await bet.save();
      continue;
    }

    const hasLost = (bet.selections || []).some(s => s.status === 'LOST');
    const hasVoid = (bet.selections || []).some(s => s.status === 'VOID');
    const allWon = !hasLost && !hasVoid;

    const user = await User.findById(bet.user);
    bet.settledAt = new Date();
    bet.cashoutAvailable = false;

    if (allWon) {
      const payout = bet.potentialWin || Number((bet.stake * bet.totalOdds).toFixed(2));
      bet.status = 'WON';
      // FIXED: schema uses `winnings`, not `payout`
      bet.winnings = payout;
      bet.paidOut = true;
      bet.paidOutAt = new Date();

      if (user) {
        user.balance = Number((user.balance + payout).toFixed(2));
        await user.save();
        if (io) {
          io.to(`user-${user._id}`).emit('balance-update', {
            newBalance: user.balance, amount: payout, type: 'bet-won',
          });
          io.to(`user-${user._id}`).emit('bet-settled', {
            betId: bet._id, status: 'WON', payout, newBalance: user.balance,
          });
        }
      }
      totalPaid += payout;
      won++;

    } else if (hasLost) {
      bet.status = 'LOST';
      // FIXED: schema uses `winnings`
      bet.winnings = 0;

      if (user && io) {
        io.to(`user-${user._id}`).emit('bet-settled', {
          betId: bet._id, status: 'LOST', payout: 0,
        });
      }
      lost++;

    } else {
      bet.status = 'VOID';
      // FIXED: schema uses `winnings`; full stake refunded
      bet.winnings = bet.stake;

      if (user) {
        user.balance = Number((user.balance + bet.stake).toFixed(2));
        await user.save();
        if (io) {
          io.to(`user-${user._id}`).emit('balance-update', {
            newBalance: user.balance, amount: bet.stake, type: 'bet-void',
          });
          io.to(`user-${user._id}`).emit('bet-settled', {
            betId: bet._id, status: 'VOID', payout: bet.stake, newBalance: user.balance,
          });
        }
      }
      voided++;
    }

    await bet.save();
  }

  return {
    settled: bets.length,
    won, lost, voided,
    totalPaid: Number(totalPaid.toFixed(2)),
  };
}

module.exports = { settleBetsForMatch, evaluateMarket };