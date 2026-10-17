// server/services/OddsApiService.js
const axios = require('axios');
const Match = require('../models/Match');
const { buildMarkets } = require('../utils/marketBuilder');

const SPORTS = [
  { key: 'soccer_epl',                  sport: 'soccer',            league: 'Premier League' },
  { key: 'soccer_spain_la_liga',        sport: 'soccer',            league: 'La Liga' },
  { key: 'soccer_italy_serie_a',        sport: 'soccer',            league: 'Serie A' },
  { key: 'soccer_germany_bundesliga',   sport: 'soccer',            league: 'Bundesliga' },
  { key: 'soccer_france_ligue_one',     sport: 'soccer',            league: 'Ligue 1' },
  { key: 'soccer_uefa_champs_league',   sport: 'soccer',            league: 'UEFA Champions League' },
  { key: 'soccer_uefa_europa_league',   sport: 'soccer',            league: 'UEFA Europa League' },
  { key: 'soccer_netherlands_eredivisie', sport: 'soccer',          league: 'Eredivisie' },
  { key: 'soccer_portugal_primeira_liga', sport: 'soccer',          league: 'Primeira Liga' },
  { key: 'soccer_usa_mls',              sport: 'soccer',            league: 'MLS' },
  { key: 'basketball_nba',              sport: 'basketball',        league: 'NBA' },
  { key: 'americanfootball_nfl',        sport: 'american-football', league: 'NFL' },
  { key: 'baseball_mlb',                sport: 'baseball',          league: 'MLB' },
  { key: 'icehockey_nhl',               sport: 'ice-hockey',        league: 'NHL' },
];

const BASE_URL = 'https://api.the-odds-api.com/v4';
const FETCH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const HORIZON_HOURS = 48;

class OddsApiService {
  constructor() {
    this.lastFetch = 0;
    this.isRunning = false;
  }

  async fetchEventsForSport(sportKey) {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) throw new Error('ODDS_API_KEY not set');

    const url = `${BASE_URL}/sports/${sportKey}/events`;
    const res = await axios.get(url, {
      params: { apiKey, dateFormat: 'iso' },
      timeout: 15000,
    });

    const remaining = res.headers['x-requests-remaining'];
    const used = res.headers['x-requests-used'];
    if (remaining) console.log(`📡 OddsApi quota: ${remaining} left (${used} used)`);

    return Array.isArray(res.data) ? res.data : [];
  }

  async upsertMatchesFromApi(force = false) {
    if (this.isRunning) {
      console.log('📡 OddsApi: already running, skipping');
      return { created: 0, skipped: 0, errored: 0 };
    }

    if (!force && Date.now() - this.lastFetch < FETCH_INTERVAL_MS) {
      console.log('📡 OddsApi: skipped (fetched within 24h)');
      return { created: 0, skipped: 0, errored: 0 };
    }

    this.isRunning = true;
    const now = Date.now();
    const horizon = now + HORIZON_HOURS * 60 * 60 * 1000;

    console.log('📡 OddsApi: fetching real fixtures...');

    let created = 0, skipped = 0, errored = 0;

    for (const cfg of SPORTS) {
      try {
        const events = await this.fetchEventsForSport(cfg.key);
        console.log(`📡 ${cfg.league}: ${events.length} events`);

        for (const ev of events) {
          const startsAt = new Date(ev.commence_time);
          if (isNaN(startsAt.getTime())) continue;
          if (startsAt.getTime() < now || startsAt.getTime() > horizon) continue;

          const home = (ev.home_team || '').trim();
          const away = (ev.away_team || '').trim();
          if (!home || !away) continue;

          const existing = await Match.findOne({
            'homeTeam.name': home,
            'awayTeam.name': away,
            startsAt: {
              $gte: new Date(startsAt.getTime() - 30 * 60 * 1000),
              $lte: new Date(startsAt.getTime() + 30 * 60 * 1000),
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

          const doc = {
            sport: cfg.sport,
            league: cfg.league,
            homeTeam: { name: home, abbreviation: abbr(home) },
            awayTeam: { name: away, abbreviation: abbr(away) },
            startsAt,
            date: startsAt,
            time: startsAt.toLocaleTimeString(),
            status: 'SCHEDULED',
            minute: 0,
            score: { home: 0, away: 0 },
            markets: buildMarkets(cfg.sport),
            events: [],
            source: 'odds-api',
            externalId: ev.id || null,
          };

          try {
            await Match.create(doc);
            created++;
          } catch (e) {
            errored++;
          }
        }
      } catch (err) {
        console.error(`📡 ${cfg.league}: ${err.message}`);
      }
    }

    this.lastFetch = Date.now();
    this.isRunning = false;
    console.log(`✅ OddsApi: created=${created} skipped=${skipped} errored=${errored}`);
    return { created, skipped, errored };
  }
}

function abbr(name) {
  if (!name) return 'TBA';
  const cleaned = String(name).replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return cleaned.substring(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

module.exports = new OddsApiService();