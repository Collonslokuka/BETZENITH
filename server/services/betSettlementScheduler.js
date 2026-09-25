// server/services/betSettlementScheduler.js
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const { settleBetsForMatch } = require('./betSettlementService');

const TICK_MS = 30 * 1000;          // every 30s
const LOOKBACK_HOURS = 6;           // scan matches finished in last 6h
const MAX_MATCHES_PER_TICK = 200;   // safety cap

class BetSettlementScheduler {
  constructor() {
    this.timer = null;
    this.running = false;
    this.busy = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('💸 Bet Settlement Scheduler started');

    this.tick().catch(err => console.error('💸 tick error:', err.message));

    this.timer = setInterval(() => {
      this.tick().catch(err => console.error('💸 tick error:', err.message));
    }, TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    console.log('💸 Bet Settlement Scheduler stopped');
  }

  async tick() {
    if (this.busy) return;
    this.busy = true;

    try {
      const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);

      const matches = await Match.find({
        status: 'FINISHED',
        $or: [
          { finishedAt: { $gte: since } },
          { updatedAt: { $gte: since } }
        ]
      })
        .select('_id score status events finishedAt')
        .limit(MAX_MATCHES_PER_TICK);

      if (matches.length === 0) return;

      let totalSettled = 0, totalWon = 0, totalLost = 0, totalVoid = 0;

      const io = global.io;

      for (const m of matches) {
        // Skip matches with no pending bets
        const hasPending = await Bet.countDocuments({
          status: 'PENDING',
          'selections.match': m._id
        });
        if (!hasPending) continue;

        const result = await settleBetsForMatch(m._id, m, io);
        totalSettled += result.settled;
        totalWon += result.won;
        totalLost += result.lost;
        totalVoid += result.voided;
      }

      if (totalSettled > 0) {
        console.log(
          `💸 Settled ${totalSettled} bets — ${totalWon} won, ${totalLost} lost, ${totalVoid} void`
        );
      }
    } finally {
      this.busy = false;
    }
  }
}

module.exports = new BetSettlementScheduler();