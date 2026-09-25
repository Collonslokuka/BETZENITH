// server/services/FixturesCoordinator.js
const Match = require('../models/Match');
const OddsApiService = require('./OddsApiService');
const DataFeedService = require('./DataFeedService');
const multiApiService = require('./multiApiService');
const { buildMarkets } = require('../utils/marketBuilder');

const ODDS_API_LEAGUES = new Set([
  'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'UEFA Champions League', 'UEFA Europa League', 'Eredivisie',
  'Primeira Liga', 'MLS', 'NBA', 'NFL', 'MLB', 'NHL',
]);

const SPORTMONKS_LEAGUES = new Set([
  'Scottish Premiership', 'Danish Superliga',
]);

class FixturesCoordinator {
  constructor() {
    this.isRunning = false;
  }

  async fetchAll() {
    if (this.isRunning) {
      console.log('📡 Coordinator: already running, skipping');
      return { total: 0, bySource: {} };
    }

    this.isRunning = true;
    console.log('📡 Coordinator: starting multi-source fetch...');

    const bySource = { 'odds-api': 0, sportmonks: 0, thesportsdb: 0 };
    const errors = [];

    try {
      const r = await OddsApiService.upsertMatchesFromApi();
      bySource['odds-api'] = r.created || 0;
      console.log(`📡 OddsApi: ${bySource['odds-api']} new matches`);
    } catch (err) {
      errors.push(`odds-api: ${err.message}`);
      console.error('📡 OddsApi failed:', err.message);
    }

    try {
      const fixtures = await DataFeedService.fetchTodaysFixtures();
      let created = 0;
      for (const f of fixtures || []) {
        if (await this.persistSportmonksFixture(f)) created++;
      }
      bySource.sportmonks = created;
      console.log(`📡 Sportmonks: ${created} new matches`);
    } catch (err) {
      errors.push(`sportmonks: ${err.message}`);
      console.error('📡 Sportmonks failed:', err.message);
    }

    try {
      const events = await multiApiService.fetchUpcoming();
      let created = 0;
      for (const ev of events) {
        if (await this.persistGenericFixture(ev)) created++;
      }
      bySource.thesportsdb = created;
      console.log(`📡 TheSportsDB: ${created} new matches`);
    } catch (err) {
      errors.push(`thesportsdb: ${err.message}`);
      console.error('📡 TheSportsDB failed:', err.message);
    }

    this.isRunning = false;

    const total = Object.values(bySource).reduce((a, b) => a + b, 0);
    console.log(`✅ Coordinator: ${total} real matches`, bySource);
    if (errors.length) console.log('   errors:', errors);

    return { total, bySource, errors };
  }

  async persistSportmonksFixture(raw) {
    try {
      const participants = raw.participants?.data || raw.participants || [];
      const home = participants.find(
        (p) => (p.meta?.location || p.location) === 'home'
      );
      const away = participants.find(
        (p) => (p.meta?.location || p.location) === 'away'
      );
      if (!home || !away) return false;

      const startsAt = new Date(raw.starting_at);
      if (isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) return false;

      const leagueName = raw.league?.data?.name || raw.league?.name || 'Sportmonks';

      const dup = await Match.findOne({
        'homeTeam.name': home.name,
        'awayTeam.name': away.name,
        startsAt: {
          $gte: new Date(startsAt.getTime() - 30 * 60 * 1000),
          $lte: new Date(startsAt.getTime() + 30 * 60 * 1000),
        },
      });
      if (dup) return false;

      await Match.create({
        sport: 'soccer',
        league: leagueName,
        homeTeam: { name: home.name, abbreviation: abbr(home.name) },
        awayTeam: { name: away.name, abbreviation: abbr(away.name) },
        startsAt,
        date: startsAt,
        time: startsAt.toLocaleTimeString(),
        status: 'SCHEDULED',
        minute: 0,
        score: { home: 0, away: 0 },
        markets: buildMarkets('soccer'),
        events: [],
        source: 'sportmonks',
        externalId: String(raw.id || ''),
      });

      return true;
    } catch (err) {
      return false;
    }
  }

  async persistGenericFixture(ev) {
    try {
      if (ODDS_API_LEAGUES.has(ev.league)) return false;

      const dup = await Match.findOne({
        'homeTeam.name': ev.homeTeam,
        'awayTeam.name': ev.awayTeam,
        startsAt: {
          $gte: new Date(ev.startsAt.getTime() - 30 * 60 * 1000),
          $lte: new Date(ev.startsAt.getTime() + 30 * 60 * 1000),
        },
      });
      if (dup) return false;

      await Match.create({
        sport: ev.sport,
        league: ev.league,
        homeTeam: { name: ev.homeTeam, abbreviation: abbr(ev.homeTeam) },
        awayTeam: { name: ev.awayTeam, abbreviation: abbr(ev.awayTeam) },
        startsAt: ev.startsAt,
        date: ev.startsAt,
        time: ev.startsAt.toLocaleTimeString(),
        status: 'SCHEDULED',
        minute: 0,
        score: { home: 0, away: 0 },
        markets: buildMarkets(ev.sport),
        events: [],
        source: 'thesportsdb',
        externalId: ev.externalId,
      });

      return true;
    } catch (err) {
      return false;
    }
  }
}

function abbr(name) {
  if (!name) return 'TBA';
  const cleaned = String(name).replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return cleaned.substring(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

// buildMarkets now comes from ../utils/marketBuilder

module.exports = new FixturesCoordinator();