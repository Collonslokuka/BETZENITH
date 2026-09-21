// server/services/aiMatchService.js
const Match = require('../models/Match');
const OddsApiService = require('./OddsApiService');
const {
  LEAGUES,
  SPORT_DURATIONS,
  SPORT_SCORE_WEIGHTS,
  pickRandom,
  pickDistinct,
  abbreviation,
} = require('../data/leagueRegistry');

// Config
const LIVE_TICK_MS = 30 * 1000;
const ROTATION_TICK_MS = 60 * 60 * 1000;
const TARGET_UPCOMING = 250;
const TARGET_LIVE = 20;
const KEEP_FINISHED_HOURS = 24;
const MIN_PER_LEAGUE = 2;

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
      await OddsApiService.upsertMatchesFromApi().catch(err =>
        console.error('📡 OddsApi error:', err.message)
      );
      await this.topUpUpcoming();
      console.log('✅ AI Match Service: rotation complete');
    } catch (err) {
      console.error('❌ rotate error:', err.message);
    }
  }

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

      if (newMinute <= dur.halftime) match.status = 'FIRST_HALF';
      else if (newMinute < dur.regular) match.status = 'SECOND_HALF';

      const isBasketball = sport === 'basketball';
      const isTennis = sport === 'tennis';

      if (isBasketball) {
        const homePts = Math.random() < weights.homeGoalRate / 2 ? 2 + Math.floor(Math.random() * 2) : 0;
        const awayPts = Math.random() < weights.awayGoalRate / 2 ? 2 + Math.floor(Math.random() * 2) : 0;
        match.score.home = Math.min((match.score.home || 0) + homePts, weights.maxScore);
        match.score.away = Math.min((match.score.away || 0) + awayPts, weights.maxScore);
      } else if (isTennis) {
        if (Math.random() < 0.03) {
          const homeWins = Math.random() < 0.5;
          if (homeWins) match.score.home = Math.min((match.score.home || 0) + 1, 3);
          else match.score.away = Math.min((match.score.away || 0) + 1, 3);
        }
      } else {
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

        const io = global.io;
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
    const coveredLeagues = await this.getCoveredLeagues(now, horizon);

    console.log(`📅 Generating ${need} mock upcoming matches (covered: ${coveredLeagues.size})`);
    await this.generateUpcomingBatch(need, coveredLeagues);
  }

  async getCoveredLeagues(from, to) {
    const rows = await Match.aggregate([
      { $match: { status: 'SCHEDULED', startsAt: { $gt: from, $lte: to } } },
      { $group: { _id: '$league', count: { $sum: 1 } } },
    ]);
    const covered = new Set();
    for (const row of rows) {
      if (row.count >= MIN_PER_LEAGUE) covered.add(row._id);
    }
    return covered;
  }

  async generateLiveBatch(count) {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const { sport, league } = pickSportAndLeague();
      const [home, away] = pickDistinct(league.teams, 2);
      const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
      const weights = SPORT_SCORE_WEIGHTS[sport] || SPORT_SCORE_WEIGHTS.soccer;

      const minutesAgo = 5 + Math.floor(Math.random() * 55);
      const startsAt = new Date(now - minutesAgo * 60 * 1000);

      const progress = minutesAgo / dur.regular;
      const baseHome = Math.floor(progress * weights.maxScore * weights.homeGoalRate * 0.4);
      const baseAway = Math.floor(progress * weights.maxScore * weights.awayGoalRate * 0.4);

      await Match.create({
        sport,
        league: league.name,
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
        source: 'mock',
      });
    }
  }

  async generateUpcomingBatch(count, coveredLeagues = new Set()) {
    const now = Date.now();

    const pool = [];
    for (const [sport, leagues] of Object.entries(LEAGUES)) {
      for (const league of leagues) {
        if (coveredLeagues.has(league.name)) continue;
        const weight = league.priority === 1 ? 4 : league.priority === 2 ? 2 : 1;
        for (let i = 0; i < weight; i++) pool.push({ sport, league });
      }
    }

    if (pool.length === 0) {
      console.log('📅 Mock generator: all leagues already covered, skipping');
      return;
    }

    let created = 0;
    for (let i = 0; i < count; i++) {
      const { sport, league } = pool[Math.floor(Math.random() * pool.length)];
      const [home, away] = pickDistinct(league.teams, 2);

      const offsetMinutes = Math.floor((i / count) * 24 * 60) + Math.floor(Math.random() * 30);
      const startsAt = new Date(now + offsetMinutes * 60 * 1000);

      const dup = await Match.findOne({
        homeTeam: { name: home },
        awayTeam: { name: away },
        startsAt: {
          $gte: new Date(startsAt.getTime() - 6 * 3600 * 1000),
          $lte: new Date(startsAt.getTime() + 6 * 3600 * 1000),
        },
      });
      if (dup) continue;

      await Match.create({
        sport,
        league: league.name,
        homeTeam: { name: home, abbreviation: abbreviation(home) },
        awayTeam: { name: away, abbreviation: abbreviation(away) },
        startsAt,
        date: startsAt,
        time: startsAt.toLocaleTimeString(),
        status: 'SCHEDULED',
        minute: 0,
        score: { home: 0, away: 0 },
        markets: buildMarkets(sport),
        events: [],
        source: 'mock',
      });
      created++;
    }

    console.log(`📅 Mock created: ${created} matches`);
  }

  async calculateAIPrediction(match) {
    const homeOdds = match.markets?.find(m => m.name === '1' || m.name === 'Home')?.odds || 2.0;
    const drawOdds = match.markets?.find(m => m.name === 'X')?.odds || 3.4;
    const awayOdds = match.markets?.find(m => m.name === '2' || m.name === 'Away')?.odds || 2.0;

    const homeProb = (1 / homeOdds) * 100;
    const drawProb = (1 / drawOdds) * 100;
    const awayProb = (1 / awayOdds) * 100;
    const total = homeProb + drawProb + awayProb;

    return {
      predictedWinner:
        homeOdds < awayOdds ? 'HOME' : awayOdds < homeOdds ? 'AWAY' : 'DRAW',
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
  const weighted = [];
  for (const l of leagues) {
    const weight = l.priority === 1 ? 4 : l.priority === 2 ? 2 : 1;
    for (let i = 0; i < weight; i++) weighted.push(l);
  }
  const league = pickRandom(weighted);
  return { sport, league };
}

function buildMarkets(sport) {
  switch (sport) {
    case 'soccer': {
      return [
        { name: '1', odds: +(1.4 + Math.random() * 2.6).toFixed(2), isActive: true },
        { name: 'X', odds: +(3.0 + Math.random() * 1.3).toFixed(2), isActive: true },
        { name: '2', odds: +(1.4 + Math.random() * 2.6).toFixed(2), isActive: true },
        { name: 'Over 2.5', odds: +(1.75 + Math.random() * 0.5).toFixed(2), isActive: true },
        { name: 'Under 2.5', odds: +(1.75 + Math.random() * 0.5).toFixed(2), isActive: true },
        { name: 'BTTS', odds: +(1.7 + Math.random() * 0.6).toFixed(2), isActive: true },
        { name: 'BTTS No', odds: +(1.7 + Math.random() * 0.6).toFixed(2), isActive: true },
      ];
    }
    case 'basketball':
      return [
        { name: 'Home', odds: +(1.2 + Math.random() * 2.0).toFixed(2), isActive: true },
        { name: 'Away', odds: +(1.2 + Math.random() * 2.0).toFixed(2), isActive: true },
        { name: 'Over 220.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
        { name: 'Under 220.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
      ];
    case 'american-football':
      return [
        { name: 'Home', odds: +(1.3 + Math.random() * 1.8).toFixed(2), isActive: true },
        { name: 'Away', odds: +(1.3 + Math.random() * 1.8).toFixed(2), isActive: true },
        { name: 'Over 45.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
        { name: 'Under 45.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
      ];
    case 'baseball':
      return [
        { name: 'Home', odds: +(1.5 + Math.random() * 1.5).toFixed(2), isActive: true },
        { name: 'Away', odds: +(1.5 + Math.random() * 1.5).toFixed(2), isActive: true },
        { name: 'Over 8.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
        { name: 'Under 8.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
      ];
    case 'ice-hockey':
      return [
        { name: 'Home', odds: +(1.5 + Math.random() * 1.5).toFixed(2), isActive: true },
        { name: 'Away', odds: +(1.5 + Math.random() * 1.5).toFixed(2), isActive: true },
        { name: 'Over 5.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
        { name: 'Under 5.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
      ];
    case 'tennis':
      return [
        { name: 'Home', odds: +(1.2 + Math.random() * 2.2).toFixed(2), isActive: true },
        { name: 'Away', odds: +(1.2 + Math.random() * 2.2).toFixed(2), isActive: true },
        { name: 'Straight Sets', odds: +(1.8 + Math.random() * 0.8).toFixed(2), isActive: true },
      ];
    case 'cricket':
    case 'mma':
      return [
        { name: 'Home', odds: +(1.3 + Math.random() * 2.0).toFixed(2), isActive: true },
        { name: 'Away', odds: +(1.3 + Math.random() * 2.0).toFixed(2), isActive: true },
      ];
    default:
      return [
        { name: '1', odds: +(1.5 + Math.random() * 2.0).toFixed(2), isActive: true },
        { name: 'X', odds: +(2.8 + Math.random() * 1.5).toFixed(2), isActive: true },
        { name: '2', odds: +(1.5 + Math.random() * 2.0).toFixed(2), isActive: true },
      ];
  }
}

module.exports = new AIMatchService();