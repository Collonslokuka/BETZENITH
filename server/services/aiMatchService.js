// server/services/aiMatchService.js
const Match = require('../models/Match');
const {
  LEAGUES,
  SPORT_DURATIONS,
  SPORT_SCORE_WEIGHTS,
  pickRandom,
  pickDistinct,
  abbreviation,
} = require('../data/leagueRegistry');

// Config
const LIVE_TICK_MS = 30 * 1000;         // update live scores every 30s
const ROTATION_TICK_MS = 60 * 60 * 1000; // rotate upcoming every hour
const TARGET_UPCOMING = 250;             // total upcoming matches to keep
const TARGET_LIVE = 20;                  // keep ~20 matches live
const KEEP_FINISHED_HOURS = 24;          // keep finished matches for 24h

class AIMatchService {
  constructor() {
    this.liveTimer = null;
    this.rotationTimer = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 AI Match Service Started');

    // First run: seed immediately
    this.tick().catch(err => console.error('🤖 tick error:', err.message));
    this.rotate().catch(err => console.error('🤖 rotate error:', err.message));

    this.liveTimer = setInterval(() => {
      this.tick().catch(err => console.error('🤖 tick error:', err.message));
    }, LIVE_TICK_MS);

    this.rotationTimer = setInterval(() => {
      this.rotate().catch(err => console.error('🤖 rotate error:', err.message));
    }, ROTATION_TICK_MS);
  }

  stop() {
    if (this.liveTimer) clearInterval(this.liveTimer);
    if (this.rotationTimer) clearInterval(this.rotationTimer);
    this.liveTimer = null;
    this.rotationTimer = null;
    this.isRunning = false;
    console.log('🤖 AI Match Service Stopped');
  }

  // ============================================================
  //  MAIN TICKS
  // ============================================================

  async tick() {
    try {
      await this.promoteScheduledToLive();
      await this.updateLiveMatches();
      await this.finishOldLive();
      await this.topUpLiveIfNeeded();
      console.log('✅ AI Match Service: tick complete');
    } catch (err) {
      console.error('❌ tick error:', err.message);
    }
  }

  async rotate() {
    try {
      await this.archiveOldFinished();
      await this.topUpUpcoming();
      console.log('✅ AI Match Service: rotation complete');
    } catch (err) {
      console.error('❌ rotate error:', err.message);
    }
  }

  // ============================================================
  //  PROMOTE / FINISH
  // ============================================================

  async promoteScheduledToLive() {
    const now = new Date();
    const toStart = await Match.find({
      status: 'SCHEDULED',
      startsAt: { $lte: now },
    }).limit(50);

    for (const match of toStart) {
      match.status = 'LIVE';
      match.minute = 0;
      match.score = { home: 0, away: 0 };
      match.lastUpdated = now;
      match.events = [];
      await match.save();
    }

    if (toStart.length) console.log(`▶️  Promoted ${toStart.length} matches to LIVE`);
  }

  async updateLiveMatches() {
    const live = await Match.find({
      status: { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] },
    });

    for (const match of live) {
      const sport = match.sport || 'soccer';
      const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
      const weights = SPORT_SCORE_WEIGHTS[sport] || SPORT_SCORE_WEIGHTS.soccer;

      const timeSince = (Date.now() - (match.lastUpdated || Date.now())) / 1000;
      const minuteInc = Math.floor(timeSince / 60);
      if (minuteInc <= 0) continue;

      const newMinute = Math.min((match.minute || 0) + minuteInc, dur.regular);
      match.minute = newMinute;

      // Update period label
      if (newMinute <= dur.halftime) match.status = 'FIRST_HALF';
      else if (newMinute < dur.regular) match.status = 'SECOND_HALF';

      // Score simulation
      const isSoccer = sport === 'soccer';
      const isBasketball = sport === 'basketball';
      const isTennis = sport === 'tennis';

      if (isBasketball) {
        // Basketball: ~2-3 points every minute per team
        const homePts = Math.random() < weights.homeGoalRate / 2 ? 2 + Math.floor(Math.random() * 2) : 0;
        const awayPts = Math.random() < weights.awayGoalRate / 2 ? 2 + Math.floor(Math.random() * 2) : 0;
        match.score.home = Math.min((match.score.home || 0) + homePts, weights.maxScore);
        match.score.away = Math.min((match.score.away || 0) + awayPts, weights.maxScore);
      } else if (isTennis) {
        // Tennis: rarely score, and scores are sets (0-3)
        if (Math.random() < 0.03) {
          const homeWins = Math.random() < 0.5;
          if (homeWins) match.score.home = Math.min((match.score.home || 0) + 1, 3);
          else match.score.away = Math.min((match.score.away || 0) + 1, 3);
        }
      } else {
        // Soccer, football, hockey, baseball, cricket, MMA: goal-based
        if (Math.random() < weights.homeGoalRate / 10) {
          match.score.home = Math.min((match.score.home || 0) + 1, weights.maxScore);
          match.events = match.events || [];
          match.events.push({
            type: 'GOAL', minute: newMinute, team: 'home',
            homeScore: match.score.home, awayScore: match.score.away,
            at: new Date(),
          });
        }
        if (Math.random() < weights.awayGoalRate / 10) {
          match.score.away = Math.min((match.score.away || 0) + 1, weights.maxScore);
          match.events = match.events || [];
          match.events.push({
            type: 'GOAL', minute: newMinute, team: 'away',
            homeScore: match.score.home, awayScore: match.score.away,
            at: new Date(),
          });
        }
      }

      match.lastUpdated = new Date();
      await match.save();
    }
  }

  async finishOldLive() {
    const live = await Match.find({
      status: { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] },
    });

    for (const match of live) {
      const sport = match.sport || 'soccer';
      const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;

      if ((match.minute || 0) >= dur.regular) {
        match.status = 'FINISHED';
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
        await match.save();

        const io = global.io || match.$app?.get('io');
        if (io) io.emit('match-finished', { matchId: match._id, result: match.result });
      }
    }
  }

  async archiveOldFinished() {
    const cutoff = new Date(Date.now() - KEEP_FINISHED_HOURS * 60 * 60 * 1000);
    const result = await Match.deleteMany({
      status: 'FINISHED',
      finishedAt: { $lt: cutoff },
    });
    if (result.deletedCount) {
      console.log(`🗑️  Archived ${result.deletedCount} old finished matches`);
    }
  }

  // ============================================================
  //  TOP-UPS
  // ============================================================

  async topUpLiveIfNeeded() {
    const liveCount = await Match.countDocuments({
      status: { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] },
    });
    if (liveCount >= TARGET_LIVE) return;

    const need = TARGET_LIVE - liveCount;
    console.log(`🔴 Only ${liveCount} live matches — generating ${need} now`);
    await this.generateLiveBatch(need);
  }

  async topUpUpcoming() {
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingCount = await Match.countDocuments({
      status: 'SCHEDULED',
      startsAt: { $gt: now, $lte: horizon },
    });

    if (upcomingCount >= TARGET_UPCOMING) {
      console.log(`📅 Upcoming OK (${upcomingCount} in 24h window)`);
      return;
    }

    const need = TARGET_UPCOMING - upcomingCount;
    console.log(`📅 Generating ${need} upcoming matches across next 24h`);
    await this.generateUpcomingBatch(need);
  }

  // ============================================================
  //  GENERATORS
  // ============================================================

  async generateLiveBatch(count) {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const { sport, league } = pickSportAndLeague();
      const [home, away] = pickDistinct(league.teams, 2);
      const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
      const weights = SPORT_SCORE_WEIGHTS[sport] || SPORT_SCORE_WEIGHTS.soccer;

      // Started 5–60 min ago
      const minutesAgo = 5 + Math.floor(Math.random() * 55);
      const startsAt = new Date(now - minutesAgo * 60 * 1000);

      // Rough score based on time played
      const progress = minutesAgo / dur.regular;
      const baseHome = Math.floor(progress * weights.maxScore * weights.homeGoalRate * 0.4);
      const baseAway = Math.floor(progress * weights.maxScore * weights.awayGoalRate * 0.4);

      await Match.create({
        sport,
        league: league.name,
        leagueId: league.id,
        country: league.country,
        homeTeam: { name: home, abbreviation: abbreviation(home) },
        awayTeam: { name: away, abbreviation: abbreviation(away) },
        startsAt,
        date: startsAt,
        time: startsAt.toLocaleTimeString(),
        status: minutesAgo <= dur.halftime ? 'FIRST_HALF' : 'SECOND_HALF',
        minute: minutesAgo,
        score: { home: Math.max(0, baseHome), away: Math.max(0, baseAway) },
        lastUpdated: new Date(),
        markets: buildMarkets(sport),
        events: [],
        aiPrediction: null,
      });
    }
  }

  async generateUpcomingBatch(count) {
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const { sport, league } = pickSportAndLeague();
      const [home, away] = pickDistinct(league.teams, 2);

      // Random time in the next 24h, spread evenly
      const offsetMinutes = Math.floor((i / count) * 24 * 60) + Math.floor(Math.random() * 30);
      const startsAt = new Date(now + offsetMinutes * 60 * 1000);

      // Avoid duplicate pairings in the same day
      const dup = await Match.findOne({
        homeTeam: { name: home },
        awayTeam: { name: away },
        startsAt: { $gte: new Date(startsAt.getTime() - 6 * 3600 * 1000), $lte: new Date(startsAt.getTime() + 6 * 3600 * 1000) },
      });
      if (dup) continue;

      await Match.create({
        sport,
        league: league.name,
        leagueId: league.id,
        country: league.country,
        homeTeam: { name: home, abbreviation: abbreviation(home) },
        awayTeam: { name: away, abbreviation: abbreviation(away) },
        startsAt,
        date: startsAt,
        time: startsAt.toLocaleTimeString(),
        status: 'SCHEDULED',
        minute: 0,
        score: { home: 0, away: 0 },
        markets: buildMarkets(sport),
        aiPrediction: null,
        events: [],
      });
    }
  }

  // ============================================================
  //  AI PREDICTION
  // ============================================================

  async generateAIPredictions() {
    const matches = await Match.find({ status: { $in: ['SCHEDULED', 'LIVE'] } });
    for (const match of matches) {
      match.aiPrediction = await this.calculateAIPrediction(match);
      await match.save();
    }
  }

  async calculateAIPrediction(match) {
    const homeOdds = match.markets?.find(m => m.name === '1')?.odds || 2.0;
    const drawOdds = match.markets?.find(m => m.name === 'X')?.odds || 3.4;
    const awayOdds = match.markets?.find(m => m.name === '2')?.odds || 2.0;

    const homeProb = (1 / homeOdds) * 100;
    const drawProb = (1 / drawOdds) * 100;
    const awayProb = (1 / awayOdds) * 100;
    const total = homeProb + drawProb + awayProb;

    return {
      predictedWinner: homeOdds < awayOdds ? 'HOME' : awayOdds < homeOdds ? 'AWAY' : 'DRAW',
      confidence: Math.floor(Math.random() * 30 + 55),
      probability: {
        home: ((homeProb / total) * 100).toFixed(1),
        draw: ((drawProb / total) * 100).toFixed(1),
        away: ((awayProb / total) * 100).toFixed(1),
      },
      insight: `${homeOdds < awayOdds ? match.homeTeam.name : match.awayTeam.name} are favored in this ${match.league} fixture.`,
    };
  }
}

// ============================================================
//  HELPERS
// ============================================================

function pickSportAndLeague() {
  const sports = Object.keys(LEAGUES);
  const sport = pickRandom(sports);
  const leagues = LEAGUES[sport];
  // Bias toward higher-priority leagues by repeating them in the pool
  const weighted = [];
  for (const l of leagues) {
    const weight = l.priority === 1 ? 4 : l.priority === 2 ? 2 : 1;
    for (let i = 0; i < weight; i++) weighted.push(l);
  }
  const league = pickRandom(weighted);
  return { sport, league };
}

function buildMarkets(sport) {
  const base = [
    { name: '1', odds: +(1.5 + Math.random() * 2).toFixed(2), isActive: true },
    { name: 'X', odds: +(2.8 + Math.random() * 1.5).toFixed(2), isActive: true },
    { name: '2', odds: +(1.5 + Math.random() * 2).toFixed(2), isActive: true },
  ];

  const extras = {
    soccer: [
      { name: 'Over 2.5', odds: 1.95, isActive: true },
      { name: 'Under 2.5', odds: 1.95, isActive: true },
      { name: 'BTTS', odds: 1.90, isActive: true },
    ],
    basketball: [
      { name: 'Over 210.5', odds: 1.90, isActive: true },
      { name: 'Under 210.5', odds: 1.90, isActive: true },
    ],
    'american-football': [
      { name: 'Over 45.5', odds: 1.90, isActive: true },
      { name: 'Under 45.5', odds: 1.90, isActive: true },
    ],
    baseball: [
      { name: 'Over 8.5', odds: 1.90, isActive: true },
      { name: 'Under 8.5', odds: 1.90, isActive: true },
    ],
    'ice-hockey': [
      { name: 'Over 5.5', odds: 1.90, isActive: true },
      { name: 'Under 5.5', odds: 1.90, isActive: true },
    ],
    tennis: [
      { name: 'Straight Sets', odds: 2.10, isActive: true },
    ],
    cricket: [],
    mma: [],
  };

  return [...base, ...(extras[sport] || [])];
}

module.exports = new AIMatchService();