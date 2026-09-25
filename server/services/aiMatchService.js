// server/services/aiMatchService.js
const Match = require('../models/Match');
const FixturesCoordinator = require('./FixturesCoordinator');
const { buildMarkets } = require('../utils/marketBuilder');
const {
  LEAGUES,
  SPORT_DURATIONS,
  SPORT_SCORE_WEIGHTS,
  pickRandom,
  pickDistinct,
  abbreviation,
} = require('../data/leagueRegistry');

// ============================================================
//  CONFIG
// ============================================================
const LIVE_TICK_MS = 30 * 1000;
const ROTATION_TICK_MS = 60 * 60 * 1000;
const KEEP_FINISHED_HOURS = 48;
const MIN_PER_LEAGUE = 2;
const PERSIST_BATCH_SIZE = 100;

const LIVE_PER_SPORT = {
  soccer: 35,
  basketball: 12,
  'american-football': 6,
  baseball: 6,
  'ice-hockey': 8,
  tennis: 12,
  cricket: 6,
  mma: 5,
};

const UPCOMING_PER_SPORT = {
  soccer: 800,
  basketball: 180,
  'american-football': 80,
  baseball: 80,
  'ice-hockey': 80,
  tennis: 120,
  cricket: 80,
  mma: 80,
};

const SEED_FINISHED_PER_SPORT = {
  soccer: 250,
  basketball: 60,
  'american-football': 30,
  baseball: 30,
  'ice-hockey': 30,
  tennis: 50,
  cricket: 25,
  mma: 25,
};

function minutesPerTick(sport) {
  const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
  return Math.max(1, Math.ceil(dur.regular / 45));
}

// ============================================================
//  SERVICE
// ============================================================
class AIMatchService {
  constructor() {
    this.liveTimer = null;
    this.rotationTimer = null;
    this.isRunning = false;
    this.tickInProgress = false;
    this.rotateInProgress = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 AI Match Service Started');

    this.seedFinishedMatches().catch(err =>
      console.error('🏁 seed-finished error:', err.message)
    );

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
    if (this.tickInProgress) return;
    this.tickInProgress = true;

    try {
      await this.promoteScheduledToLive();
      await this.updateLiveMatches();
      await this.finishOldLive();
      await this.topUpLiveIfNeeded();
      console.log('✅ tick complete');
    } catch (err) {
      console.error('❌ tick error:', err.message);
    } finally {
      this.tickInProgress = false;
    }
  }

  async rotate() {
    if (this.rotateInProgress) return;
    this.rotateInProgress = true;

    try {
      await this.archiveOldFinished();

      await FixturesCoordinator.fetchAll().catch(err =>
        console.error('📡 Coordinator error:', err.message)
      );

      await this.topUpUpcoming();

      console.log('✅ rotation complete');
    } catch (err) {
      console.error('❌ rotate error:', err.message);
    } finally {
      this.rotateInProgress = false;
    }
  }

  async promoteScheduledToLive() {
    const now = new Date();
    const toStart = await Match.find({
      status: 'SCHEDULED',
      startsAt: { $lte: now },
    }).limit(200);

    for (const match of toStart) {
      match.status = 'FIRST_HALF';
      match.minute = 0;
      match.score = { home: 0, away: 0 };
      match.lastUpdated = now;
      match.events = [];
      await match.save();
    }

    if (toStart.length) console.log(`▶️  Promoted ${toStart.length} to LIVE`);
  }

  async updateLiveMatches() {
    const live = await Match.find({
      status: { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] },
    });

    for (const match of live) {
      const sport = match.sport || 'soccer';
      const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
      const weights = SPORT_SCORE_WEIGHTS[sport] || SPORT_SCORE_WEIGHTS.soccer;

      const tick = minutesPerTick(sport);
      const newMinute = Math.min((match.minute || 0) + tick, dur.regular);
      match.minute = newMinute;

      if (newMinute < dur.halftime) match.status = 'FIRST_HALF';
      else if (newMinute === dur.halftime) match.status = 'HALFTIME';
      else if (newMinute < dur.regular) match.status = 'SECOND_HALF';
      else match.status = 'SECOND_HALF';

      // ── SCRIPTED OUTCOME (admin-created matches) ──
      if (match.source === 'admin-manual' && match.scriptedOutcome?.homeScore !== null && match.scriptedOutcome?.homeScore !== undefined) {
        const targetHome = match.scriptedOutcome.homeScore || 0;
        const targetAway = match.scriptedOutcome.awayScore || 0;

        const schedule = goalScheduleForMatch(match._id, targetHome, targetAway);

        let h = 0, a = 0;
        for (const g of schedule) {
          if (g.minute <= newMinute) {
            if (g.team === 'home') h++;
            else a++;
          }
        }

        if (h !== (match.score.home || 0)) {
          match.events = match.events || [];
          match.events.push({
            type: 'GOAL', minute: newMinute, team: 'home',
            homeScore: h, awayScore: a,
            at: new Date(),
          });
        }
        if (a !== (match.score.away || 0)) {
          match.events = match.events || [];
          match.events.push({
            type: 'GOAL', minute: newMinute, team: 'away',
            homeScore: h, awayScore: a,
            at: new Date(),
          });
        }

        match.score = { home: h, away: a };

        // ── NEW: random card during play ──
        if (newMinute >= 1 && Math.random() < 0.06) {
          const isRed = Math.random() < 0.05;
          match.events = match.events || [];
          match.events.push({
            type: isRed ? 'RED_CARD' : 'YELLOW_CARD',
            minute: newMinute,
            team: Math.random() < 0.5 ? 'home' : 'away',
            player: randomPlayerName(),
          });
        }

        match.lastUpdated = new Date();
        await match.save();

        const io = global.io;
        if (io) {
          io.to(`match-${match._id}`).emit('match-update', {
            _id: match._id,
            score: match.score,
            minute: match.minute,
            status: match.status,
            league: match.league,
            lastUpdated: match.lastUpdated,
          });
        }
        continue;
      }
      // ── END SCRIPTED OUTCOME ──

      const isBasketball = sport === 'basketball';
      const isTennis = sport === 'tennis';
      const isMMA = sport === 'mma';

      if (isBasketball) {
        const homePts = Math.random() < 0.7 ? 2 + Math.floor(Math.random() * 3) : 0;
        const awayPts = Math.random() < 0.65 ? 2 + Math.floor(Math.random() * 3) : 0;
        match.score.home = Math.min((match.score.home || 0) + homePts, weights.maxScore);
        match.score.away = Math.min((match.score.away || 0) + awayPts, weights.maxScore);
      } else if (isTennis) {
        if (Math.random() < 0.05) {
          const homeWins = Math.random() < 0.5;
          if (homeWins) match.score.home = Math.min((match.score.home || 0) + 1, 3);
          else match.score.away = Math.min((match.score.away || 0) + 1, 3);
        }
      } else if (isMMA) {
        if (Math.random() < 0.08) {
          const homeWins = Math.random() < 0.5;
          if (homeWins) match.score.home = Math.min((match.score.home || 0) + 1, 1);
          else match.score.away = Math.min((match.score.away || 0) + 1, 1);
        }
      } else {
        if (Math.random() < weights.homeGoalRate * tick / 30) {
          match.score.home = Math.min((match.score.home || 0) + 1, weights.maxScore);
          match.events = match.events || [];
          match.events.push({
            type: 'GOAL', minute: newMinute, team: 'home',
            homeScore: match.score.home, awayScore: match.score.away,
            at: new Date(),
          });
        }
        if (Math.random() < weights.awayGoalRate * tick / 30) {
          match.score.away = Math.min((match.score.away || 0) + 1, weights.maxScore);
          match.events = match.events || [];
          match.events.push({
            type: 'GOAL', minute: newMinute, team: 'away',
            homeScore: match.score.home, awayScore: match.score.away,
            at: new Date(),
          });
        }
      }

      // ── NEW: random card during play (mock matches) ──
      if (newMinute >= 1 && Math.random() < 0.06) {
        const isRed = Math.random() < 0.05;
        match.events = match.events || [];
        match.events.push({
          type: isRed ? 'RED_CARD' : 'YELLOW_CARD',
          minute: newMinute,
          team: Math.random() < 0.5 ? 'home' : 'away',
          player: randomPlayerName(),
        });
      }

      match.lastUpdated = new Date();
      await match.save();

      const io = global.io;
      if (io) {
        io.to(`match-${match._id}`).emit('match-update', {
          _id: match._id,
          score: match.score,
          minute: match.minute,
          status: match.status,
          league: match.league,
          lastUpdated: match.lastUpdated,
        });
      }
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
        if (
          match.source === 'admin-manual' &&
          match.scriptedOutcome?.homeScore !== null &&
          match.scriptedOutcome?.homeScore !== undefined
        ) {
          match.score = {
            home: match.scriptedOutcome.homeScore || 0,
            away: match.scriptedOutcome.awayScore || 0,
          };
        }

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

        try {
          const { settleBetsForMatch } = require('./betSettlementService');
          const result = await settleBetsForMatch(match._id, match, global.io);
          if (result?.settled > 0) {
            console.log(`💰 Settled ${result.settled} bets for match ${match._id} (won ${result.won}, lost ${result.lost})`);
          }
        } catch (err) {
          console.error('[ai-sim] settle failed for', match._id, err.message);
        }
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

  async seedFinishedMatches() {
    const total = await Match.countDocuments({ status: 'FINISHED' });
    if (total >= 100) {
      console.log(`🏁 Already ${total} finished matches, skipping seed`);
      return;
    }

    console.log('🏁 Seeding finished matches across all sports...');
    const now = Date.now();

    for (const [sport, target] of Object.entries(SEED_FINISHED_PER_SPORT)) {
      const existing = await Match.countDocuments({ sport, status: 'FINISHED' });
      const need = target - existing;
      if (need <= 0) continue;

      const leagues = LEAGUES[sport] || [];
      if (leagues.length === 0) continue;

      const docs = [];
      for (let i = 0; i < need; i++) {
        const league = pickRandom(leagues);
        const [home, away] = pickDistinct(league.teams, 2);
        const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
        const weights = SPORT_SCORE_WEIGHTS[sport] || SPORT_SCORE_WEIGHTS.soccer;

        const hoursAgo = 1 + Math.random() * 20;
        const startsAt = new Date(now - hoursAgo * 60 * 60 * 1000);
        const finishedAt = new Date(startsAt.getTime() + dur.regular * 60 * 1000);

        const homeScore = Math.floor(weights.homeGoalRate * 3 * Math.random() + Math.random() * 2);
        const awayScore = Math.floor(weights.awayGoalRate * 3 * Math.random() + Math.random() * 2);

        docs.push({
          sport,
          league: league.name,
          homeTeam: { name: home, abbreviation: abbreviation(home) },
          awayTeam: { name: away, abbreviation: abbreviation(away) },
          startsAt,
          finishedAt,
          date: startsAt,
          time: startsAt.toLocaleTimeString(),
          status: 'FINISHED',
          minute: dur.regular,
          score: { home: homeScore, away: awayScore },
          result: {
            winner: homeScore > awayScore ? 'HOME' : awayScore > homeScore ? 'AWAY' : 'DRAW',
            score: { home: homeScore, away: awayScore },
            isSettled: true,
            settledAt: finishedAt,
          },
          lastUpdated: finishedAt,
          markets: buildMarkets(sport),
          events: [],
          source: 'mock',
        });
      }

      let inserted = 0;
      for (let i = 0; i < docs.length; i += PERSIST_BATCH_SIZE) {
        const batch = docs.slice(i, i + PERSIST_BATCH_SIZE);
        try {
          const res = await Match.insertMany(batch, { ordered: false });
          inserted += res.length;
        } catch (e) {
          inserted += (e.insertedDocs || []).length;
        }
      }
      console.log(`🏁 Seeded ${inserted} finished ${sport}`);
    }
  }

  async topUpLiveIfNeeded() {
    const counts = await Match.aggregate([
      { $match: { status: { $in: ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'] } } },
      { $group: { _id: '$sport', count: { $sum: 1 } } },
    ]);

    const bySport = {};
    for (const row of counts) bySport[row._id || 'soccer'] = row.count;

    for (const [sport, target] of Object.entries(LIVE_PER_SPORT)) {
      const current = bySport[sport] || 0;
      if (current < target) {
        const need = target - current;
        console.log(`🔴 ${sport}: ${current} live (need ${need})`);
        await this.generateLiveBatch(need, sport);
      }
    }
  }

  async topUpUpcoming() {
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const counts = await Match.aggregate([
      { $match: { status: 'SCHEDULED', startsAt: { $gt: now, $lte: horizon } } },
      { $group: { _id: '$sport', count: { $sum: 1 } } },
    ]);

    const bySport = {};
    for (const row of counts) bySport[row._id || 'soccer'] = row.count;

    for (const [sport, target] of Object.entries(UPCOMING_PER_SPORT)) {
      const current = bySport[sport] || 0;
      if (current < target) {
        const need = target - current;
        const coveredLeagues = await this.getCoveredLeagues(sport, now, horizon);
        console.log(`📅 ${sport}: ${current} upcoming (need ${need})`);
        await this.generateUpcomingBatch(need, sport, coveredLeagues);
      }
    }
  }

  async getCoveredLeagues(sport, from, to) {
    const rows = await Match.aggregate([
      { $match: { sport, status: 'SCHEDULED', startsAt: { $gt: from, $lte: to } } },
      { $group: { _id: '$league', count: { $sum: 1 } } },
    ]);
    const covered = new Set();
    for (const row of rows) {
      if (row.count >= MIN_PER_LEAGUE) covered.add(row._id);
    }
    return covered;
  }

  async generateLiveBatch(count, sport) {
    const now = Date.now();
    const leagues = LEAGUES[sport] || [];
    if (leagues.length === 0) return 0;

    const docs = [];
    for (let i = 0; i < count; i++) {
      const league = pickRandom(leagues);
      const [home, away] = pickDistinct(league.teams, 2);
      const dur = SPORT_DURATIONS[sport] || SPORT_DURATIONS.soccer;
      const weights = SPORT_SCORE_WEIGHTS[sport] || SPORT_SCORE_WEIGHTS.soccer;

      const maxMinutesAgo = Math.min(35, Math.floor(dur.regular * 0.6));
      const minutesAgo = 5 + Math.floor(Math.random() * (maxMinutesAgo - 5));
      const startsAt = new Date(now - minutesAgo * 60 * 1000);

      const progress = minutesAgo / dur.regular;
      const baseHome = Math.floor(progress * weights.maxScore * weights.homeGoalRate * 0.4);
      const baseAway = Math.floor(progress * weights.maxScore * weights.awayGoalRate * 0.4);

      docs.push({
        sport,
        league: league.name,
        homeTeam: { name: home, abbreviation: abbreviation(home) },
        awayTeam: { name: away, abbreviation: abbreviation(away) },
        startsAt,
        date: startsAt,
        time: startsAt.toLocaleTimeString(),
        status: minutesAgo < dur.halftime ? 'FIRST_HALF' : 'SECOND_HALF',
        minute: minutesAgo,
        score: { home: Math.max(0, baseHome), away: Math.max(0, baseAway) },
        lastUpdated: new Date(),
        markets: buildMarkets(sport),
        events: [],
        source: 'mock',
      });
    }

    let created = 0;
    try {
      const res = await Match.insertMany(docs, { ordered: false });
      created = res.length;
    } catch (e) {
      created = (e.insertedDocs || []).length;
    }
    return created;
  }

  async generateUpcomingBatch(count, sport, coveredLeagues = new Set()) {
    const now = Date.now();
    const leaguesInSport = LEAGUES[sport] || [];
    if (leaguesInSport.length === 0) return 0;

    const pool = [];
    for (const league of leaguesInSport) {
      if (coveredLeagues.has(league.name)) continue;
      const weight = league.priority === 1 ? 4 : league.priority === 2 ? 2 : 1;
      for (let i = 0; i < weight; i++) pool.push(league);
    }

    const sourcePool = pool.length > 0 ? pool : leaguesInSport;
    const docs = [];

    for (let i = 0; i < count; i++) {
      const league = sourcePool[Math.floor(Math.random() * sourcePool.length)];
      const [home, away] = pickDistinct(league.teams, 2);

      const offsetMinutes = Math.floor((i / count) * 24 * 60) + Math.floor(Math.random() * 30);
      const startsAt = new Date(now + offsetMinutes * 60 * 1000);

      docs.push({
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
    }

    let created = 0;
    for (let i = 0; i < docs.length; i += PERSIST_BATCH_SIZE) {
      const batch = docs.slice(i, i + PERSIST_BATCH_SIZE);
      try {
        const res = await Match.insertMany(batch, { ordered: false });
        created += res.length;
      } catch (e) {
        created += (e.insertedDocs || []).length;
      }
    }
    return created;
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
// buildMarkets now comes from ../utils/marketBuilder

// NEW: random player name for cards
const FIRST_INITIALS = ['J.','M.','A.','K.','L.','R.','S.','T.','D.','B.','C.','N.','P.','E.','V.'];
const LAST_NAMES = [
  'Silva','Garcia','Müller','Rossi','Salah','Kane','Lopez','Martinez',
  'Kovac','Novak','Petrov','Dembélé','Fernandes','Andersen','Costa',
  'Ivanov','Yilmaz','Diallo','Nowak','Horvat',
];
function randomPlayerName() {
  const f = FIRST_INITIALS[Math.floor(Math.random() * FIRST_INITIALS.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}

function goalScheduleForMatch(matchId, targetHome, targetAway) {
  const seed = String(matchId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const goals = [];
  let counter = 0;

  for (let i = 0; i < targetHome; i++) goals.push({ team: 'home', key: seed + (++counter) * 17 });
  for (let i = 0; i < targetAway; i++) goals.push({ team: 'away', key: seed + (++counter) * 23 });

  for (const g of goals) {
    const r = (g.key * 9301 + 49297) % 233280;
    g.minute = 5 + Math.floor((r / 233280) * 80);
  }
  goals.sort((a, b) => a.minute - b.minute);
  return goals;
}

module.exports = new AIMatchService();