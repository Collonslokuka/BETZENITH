// src/pages/LeaguePage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import BetSlip from '../components/BetSlip';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../services/axios';

// Display names → real DB league names
const LEAGUE_ALIASES = {
  // Soccer
  'EPL': 'Premier League',
  'English Premier League': 'Premier League',
  'Premier League': 'Premier League',
  'La Liga': 'La Liga',
  'La Liga - Spain': 'La Liga',
  'Serie A': 'Serie A',
  'Serie A - Italy': 'Serie A',
  'Bundesliga': 'Bundesliga',
  'Bundesliga - Germany': 'Bundesliga',
  'Ligue 1': 'Ligue 1',
  'Ligue 1 - France': 'Ligue 1',
  'UCL': 'UEFA Champions League',
  'Champions League': 'UEFA Champions League',
  'UEFA Champions League': 'UEFA Champions League',
  'UEL': 'UEFA Europa League',
  'Europa League': 'UEFA Europa League',
  'UEFA Europa League': 'UEFA Europa League',
  'UECL': 'UEFA Conference League',
  'Conference League': 'UEFA Conference League',
  'Championship': 'EFL Championship',
  'EFL Championship': 'EFL Championship',
  'Eredivisie': 'Eredivisie',
  'Primeira Liga': 'Primeira Liga',
  'Scottish Premiership': 'Scottish Premiership',
  'Turkish Super Lig': 'Turkish Super Lig',
  'Belgian Pro League': 'Belgian Pro League',
  'Greek Super League': 'Greek Super League',
  'Austrian Bundesliga': 'Austrian Bundesliga',
  'Swiss Super League': 'Swiss Super League',
  'Saudi Pro League': 'Saudi Pro League',
  'MLS': 'MLS',
  'Liga MX': 'Liga MX',
  'Brasileirao': 'Brasileirão Série A',
  'Brasileirão Série A': 'Brasileirão Série A',
  'J1 League': 'J1 League',
  'K League 1': 'K League 1',

  // Basketball
  'NBA': 'NBA',
  'EuroLeague': 'EuroLeague',
  'WNBA': 'WNBA',
  'NCAA Basketball': 'NCAA Basketball',

  // Football
  'NFL': 'NFL',
  'NCAAF': 'NCAA Football',
  'NCAA Football': 'NCAA Football',

  // Baseball
  'MLB': 'MLB',

  // Hockey
  'NHL': 'NHL',

  // Tennis
  'ATP': 'ATP Tour',
  'ATP Tour': 'ATP Tour',
  'WTA': 'WTA Tour',
  'WTA Tour': 'WTA Tour',

  // Cricket
  'IPL': 'Indian Premier League',
  'Indian Premier League': 'Indian Premier League',
  'Big Bash': 'Big Bash League',
  'Big Bash League': 'Big Bash League',
  'PSL': 'Pakistan Super League',
  'Pakistan Super League': 'Pakistan Super League',

  // MMA
  'UFC': 'UFC',
  'PFL': 'PFL',
};

const leagueLogos = {
  'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'La Liga': '🇪🇸',
  'Bundesliga': '🇩🇪',
  'Serie A': '🇮🇹',
  'Ligue 1': '🇫🇷',
  'UEFA Champions League': '🏆',
  'UEFA Europa League': '🏆',
  'UEFA Conference League': '🏆',
  'EFL Championship': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Eredivisie': '🇳🇱',
  'Primeira Liga': '🇵🇹',
  'Scottish Premiership': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Saudi Pro League': '🇸🇦',
  'MLS': '🇺🇸',
  'Liga MX': '🇲🇽',
  'Brasileirão Série A': '🇧🇷',
  'NBA': '🏀',
  'EuroLeague': '🏀',
  'WNBA': '🏀',
  'NCAA Basketball': '🏀',
  'NFL': '🏈',
  'NCAA Football': '🏈',
  'MLB': '⚾',
  'NHL': '🏒',
  'ATP Tour': '🎾',
  'WTA Tour': '🎾',
  'Indian Premier League': '🏏',
  'Big Bash League': '🏏',
  'Pakistan Super League': '🏏',
  'UFC': '🥊',
  'PFL': '🥊',
  default: '🏆',
};

export default function LeaguePage() {
  const { leagueName } = useParams();
  const decodedLeagueName = decodeURIComponent(leagueName || '');
  const canonicalLeague = LEAGUE_ALIASES[decodedLeagueName] || decodedLeagueName;

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLeagueMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all statuses (scheduled + live + finished) for this league
        const [scheduledRes, liveRes, finishedRes] = await Promise.all([
          api.get('/ai-matches/scheduled', { params: { league: canonicalLeague, limit: 200 } }).catch(() => ({ data: { data: [] } })),
          api.get('/ai-matches/live').catch(() => ({ data: { data: [] } })),
          api.get('/ai-matches/finished').catch(() => ({ data: { data: [] } })),
        ]);

        const unwrap = (res) => {
          const d = res?.data?.data;
          if (Array.isArray(d)) return d;
          if (res?.data && Array.isArray(res.data)) return res.data;
          return [];
        };

        const scheduled = unwrap(scheduledRes);
        const live = unwrap(liveRes).filter(m => m.league === canonicalLeague);
        const finished = unwrap(finishedRes).filter(m => m.league === canonicalLeague);

        const all = [...live, ...scheduled, ...finished];

        // De-dupe by _id (in case a match appears in multiple responses)
        const seen = new Set();
        const unique = all.filter(m => {
          const id = String(m._id || m.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        // Sort: live first, then by start time
        unique.sort((a, b) => {
          const liveA = ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'].includes(a.status) ? 0 : 1;
          const liveB = ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'].includes(b.status) ? 0 : 1;
          if (liveA !== liveB) return liveA - liveB;
          return new Date(a.startsAt) - new Date(b.startsAt);
        });

        if (!cancelled) {
          console.log(`🏆 League "${decodedLeagueName}" → DB "${canonicalLeague}" → ${unique.length} matches`);
          setMatches(unique);
        }
      } catch (err) {
        console.error('League fetch error:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeagueMatches();
    return () => { cancelled = true; };
  }, [canonicalLeague, decodedLeagueName]);

  const getLeagueLogo = () => {
    if (leagueLogos[canonicalLeague]) return leagueLogos[canonicalLeague];
    return leagueLogos.default;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading {canonicalLeague} matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c14] py-8">
      <div className="container mx-auto px-4">
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-6">
              <Link
                to="/"
                className="p-2 bg-[#1a1f2e] rounded-lg hover:bg-[#2a3042] transition-colors"
              >
                <FiArrowLeft className="text-gray-400" />
              </Link>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getLeagueLogo()}</span>
                <div>
                  <h1 className="text-2xl font-bold text-white">{decodedLeagueName}</h1>
                  {canonicalLeague !== decodedLeagueName && (
                    <p className="text-xs text-gray-500">{canonicalLeague}</p>
                  )}
                </div>
              </div>
              <span className="text-sm bg-[#2e7d32]/10 text-[#2e7d32] px-3 py-1 rounded-full">
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </span>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-red-400 text-sm">Failed to load matches: {error}</p>
              </div>
            )}

            {matches.length === 0 ? (
              <div className="bg-[#1a1f2e] rounded-xl p-12 text-center border border-[#2a3042]">
                <p className="text-gray-400 mb-2">No matches found for {canonicalLeague}</p>
                <p className="text-sm text-gray-500 mb-6">This league may not have fixtures scheduled right now</p>
                <div className="flex justify-center space-x-4">
                  <Link
                    to="/live"
                    className="px-6 py-2 bg-[#2e7d32] text-white rounded-lg hover:bg-[#1e5a22] transition-colors"
                  >
                    View Live Matches
                  </Link>
                  <Link
                    to="/pre-match"
                    className="px-6 py-2 bg-[#1a1f2e] text-white rounded-lg hover:bg-[#2a3042] transition-colors border border-[#2a3042]"
                  >
                    View Pre-Match
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map(match => (
                  <MatchCard key={match._id || match.id} match={match} />
                ))}
              </div>
            )}
          </div>

          <div className="w-80 hidden lg:block">
            <div className="sticky top-24">
              <BetSlip />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}