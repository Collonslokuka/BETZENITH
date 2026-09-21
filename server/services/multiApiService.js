// server/services/multiApiService.js
const axios = require('axios');

/**
 * MultiApiService — free fallback using TheSportsDB.
 * Only used when OddsApiService and Sportmonks don't cover a league.
 *
 * TheSportsDB free tier:
 *   - No API key required (test key "3")
 *   - 30 requests/min limit
 *   - Provides upcoming fixtures + recent results
 *   - Does NOT provide in-play scores
 */
class MultiApiService {
  constructor() {
    this.baseUrl = 'https://www.thesportsdb.com/api/v1/json/3';
  }

  get leagueIds() {
    return [
      { id: '4328', name: 'Premier League',        sport: 'soccer' },
      { id: '4335', name: 'La Liga',               sport: 'soccer' },
      { id: '4332', name: 'Serie A',               sport: 'soccer' },
      { id: '4331', name: 'Bundesliga',            sport: 'soccer' },
      { id: '4334', name: 'Ligue 1',               sport: 'soccer' },
      { id: '4480', name: 'UEFA Champions League', sport: 'soccer' },
      { id: '4481', name: 'UEFA Europa League',    sport: 'soccer' },
      { id: '4387', name: 'NBA',                   sport: 'basketball' },
      { id: '4391', name: 'NFL',                   sport: 'american-football' },
      { id: '4424', name: 'MLB',                   sport: 'baseball' },
      { id: '4380', name: 'NHL',                   sport: 'ice-hockey' },
    ];
  }

  async fetchLeagueUpcoming(leagueId, leagueName, sport) {
    try {
      const res = await axios.get(`${this.baseUrl}/eventsnextleague.php`, {
        params: { id: leagueId },
        timeout: 10000,
      });
      const events = res.data?.events || [];

      return events
        .map((ev) => {
          const date = ev.dateEvent;
          const time = ev.strTime || '00:00:00';
          const startsAt = new Date(`${date}T${time}Z`);
          if (isNaN(startsAt.getTime())) return null;
          if (startsAt.getTime() <= Date.now()) return null;

          return {
            source: 'thesportsdb',
            externalId: ev.idEvent,
            sport,
            league: leagueName,
            homeTeam: ev.strHomeTeam,
            awayTeam: ev.strAwayTeam,
            startsAt,
            venue: ev.strVenue || null,
          };
        })
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  async fetchUpcoming() {
    const all = [];
    for (const l of this.leagueIds) {
      const matches = await this.fetchLeagueUpcoming(l.id, l.name, l.sport);
      all.push(...matches);
      await new Promise((r) => setTimeout(r, 100)); // stay under 30/min
    }
    console.log(`📡 TheSportsDB: ${all.length} upcoming events`);
    return all;
  }
}

module.exports = new MultiApiService();