// src/pages/AdminPanel.jsx
import { useState, useEffect } from 'react';
import api from '../services/axios';
import toast from 'react-hot-toast';

const SPORTS = ['soccer', 'basketball', 'tennis', 'american-football', 'baseball', 'ice-hockey', 'cricket', 'mma'];
const STATUSES = ['SCHEDULED', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF', 'FINISHED'];

const LEAGUES = [
  'Club Friendly',
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  'UEFA Champions League',
  'UEFA Europa League',
  'NBA',
  'EuroLeague',
  'ATP Tour',
  'WTA Tour',
  'MLB',
  'NFL',
  'NHL',
  'UFC',
  'Indian Premier League',
  'Other',
];

const DEFAULT_ODDS = { home: '1.90', draw: '3.40', away: '3.80' };

// ─── market grouping for the editor ───
const WINNER       = ['1', 'X', '2', 'Home', 'Away'];
const isDC         = n => n.startsWith('Double Chance');
const isBTTS       = n => n === 'BTTS' || n === 'BTTS No';
const is1H         = n => n.startsWith('1H ');
const isHTFT       = n => /^[1X2]\/[1X2]$/.test(n);
const isCS         = n => /^\d+:\d+$/.test(n) || n === 'Other' || n === '1H Other';
const isCombo      = n => n.includes('&');

function marketGroup(n) {
  if (WINNER.includes(n)) return 'Match Winner';
  if (isDC(n))            return 'Double Chance';
  if (isBTTS(n))          return 'BTTS';
  if (is1H(n))            return '1st Half';
  if (isHTFT(n))          return 'Half / Full';
  if (isCS(n))            return 'Correct Score';
  if (isCombo(n))         return 'Combinations';
  if (/^(Over|Under)/.test(n)) return 'Totals';
  return 'Other';
}

const GROUP_ORDER = [
  'Match Winner', 'Double Chance', 'Totals', 'BTTS',
  'Combinations', 'Correct Score', 'Half / Full', '1st Half', 'Other',
];

function toLocalInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToUTC(localStr) {
  if (!localStr) return null;
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function scoreFromWinnerMargin(winner, margin) {
  const m = Math.max(0, Math.min(20, Math.floor(Number(margin) || 0)));
  if (winner === 'HOME') return { home: String(m), away: '0' };
  if (winner === 'AWAY') return { home: '0', away: String(m) };
  return { home: String(m), away: String(m) };
}

function getOddsFromMarkets(match) {
  const m = match.markets || [];
  const find = (name) => m.find(x => x.name === name)?.odds;
  return {
    home: find('1') ?? find('Home') ?? '',
    draw: find('X') ?? '',
    away: find('2') ?? find('Away') ?? '',
  };
}

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);

  const [form, setForm] = useState(() => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    return {
      sport: 'soccer',
      league: 'Club Friendly',
      homeTeam: '',
      awayTeam: '',
      startsAt: toLocalInput(d),
      winner: 'HOME',
      margin: '1',
      finalHomeScore: '1',
      finalAwayScore: '0',
      odds: { ...DEFAULT_ODDS },
    };
  });

  const [predForm, setPredForm] = useState({
    matchId: null,
    predictedWinner: 'HOME',
    predictedScore: '2-1',
    note: '',
  });

  const authHeaders = { 'x-admin-token': token };

  const applyWinnerMargin = (winner, margin) => {
    const { home, away } = scoreFromWinnerMargin(winner, margin);
    setForm(f => ({ ...f, winner, margin: String(margin), finalHomeScore: home, finalAwayScore: away }));
  };

  const login = async () => {
    try {
      await api.post('/admin-panel/login', { token });
      localStorage.setItem('adminToken', token);
      setAuthed(true);
      toast.success('Welcome, Admin');
      loadMatches();
    } catch { toast.error('Wrong token'); }
  };

  const loadMatches = async () => {
    try {
      const r = await api.get('/admin-panel/matches?limit=100', { headers: authHeaders });
      setMatches(r.data.data || []);
    } catch (e) { toast.error('Failed to load'); }
  };

  const loadPredictions = async () => {
    try {
      const r = await api.get('/admin-panel/predictions', { headers: authHeaders });
      setPredictions(r.data.data || []);
    } catch (e) { toast.error('Failed to load'); }
  };

  useEffect(() => { if (authed) { loadMatches(); loadPredictions(); } }, [authed]);

  const createMatch = async (e) => {
    e.preventDefault();
    const oddsPayload = {};
    if (form.odds.home !== '') oddsPayload.home = Number(form.odds.home);
    if (form.odds.draw !== '') oddsPayload.draw = Number(form.odds.draw);
    if (form.odds.away !== '') oddsPayload.away = Number(form.odds.away);

    const startsAtUTC = localInputToUTC(form.startsAt);
    if (!startsAtUTC) return toast.error('Invalid start time');

    try {
      await api.post(
        '/admin-panel/matches',
        { ...form, startsAt: startsAtUTC, odds: oddsPayload },
        { headers: authHeaders }
      );
      toast.success(`Match created in ${form.league} — ${form.finalHomeScore}-${form.finalAwayScore}`);
      const next = toLocalInput(new Date(Date.now() + 10 * 60 * 1000));
      setForm({
        ...form, homeTeam: '', awayTeam: '', startsAt: next,
        winner: 'HOME', margin: '1', finalHomeScore: '1', finalAwayScore: '0',
        odds: { ...DEFAULT_ODDS },
      });
      loadMatches();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const updateScore = async (match, homeScore, awayScore, status) => {
    try {
      const r = await api.put(`/admin-panel/matches/${match._id}`, {
        score: { home: homeScore, away: awayScore }, status,
      }, { headers: authHeaders });

      const s = r.data.settlement;
      if (s && s.settled > 0) {
        toast.success(`Settled ${s.settled} bet${s.settled > 1 ? 's' : ''} — ${s.won} won, ${s.lost} lost`);
      } else { toast.success('Updated'); }
      loadMatches();
    } catch (e) { toast.error('Failed'); }
  };

  const updateTime = async (match, localStartsAt) => {
    if (!localStartsAt) return toast.error('Pick a time first');
    const iso = localInputToUTC(localStartsAt);
    if (!iso) return toast.error('Invalid time');
    try {
      await api.put(`/admin-panel/matches/${match._id}`, { startsAt: iso }, { headers: authHeaders });
      toast.success('Start time updated');
      loadMatches();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update time'); }
  };

  const updateOdds = async (match, odds) => {
    const oddsPayload = {};
    if (odds.home !== '') oddsPayload.home = Number(odds.home);
    if (odds.draw !== '') oddsPayload.draw = Number(odds.draw);
    if (odds.away !== '') oddsPayload.away = Number(odds.away);
    try {
      await api.put(`/admin-panel/matches/${match._id}`, { odds: oddsPayload }, { headers: authHeaders });
      toast.success('Base odds updated');
      loadMatches();
    } catch (e) { toast.error('Failed to update odds'); }
  };

  // NEW: bulk-update every market
  const updateMarkets = async (match, marketsPayload) => {
    try {
      await api.put(
        `/admin-panel/matches/${match._id}`,
        { markets: marketsPayload },
        { headers: authHeaders }
      );
      toast.success('All markets updated');
      loadMatches();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update markets');
    }
  };

  const setTarget = async (matchId, homeScore, awayScore) => {
    try {
      await api.post(`/admin-panel/matches/${matchId}/script`, { homeScore, awayScore }, { headers: authHeaders });
      toast.success('Target score set — match will play out to this result');
      loadMatches();
    } catch (e) { toast.error('Failed'); }
  };

  const deleteMatch = async (id) => {
    if (!confirm('Delete this match?')) return;
    try {
      await api.delete(`/admin-panel/matches/${id}`, { headers: authHeaders });
      toast.success('Deleted');
      loadMatches();
    } catch { toast.error('Failed'); }
  };

  const copyMatchLink = async (match) => {
    const slug = match.slug || match._id;
    const url = `${window.location.origin}/match/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Match link copied!');
    } catch { toast.error('Copy failed — ' + url); }
  };

  const generatePrediction = async () => {
    if (!predForm.matchId) return toast.error('Pick a match');
    try {
      const r = await api.post(`/admin-panel/matches/${predForm.matchId}/predict`, {
        predictedWinner: predForm.predictedWinner,
        predictedScore: predForm.predictedScore,
        note: predForm.note,
      }, { headers: authHeaders });
      const url = `${window.location.origin}/predict/${r.data.slug}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
      loadPredictions();
    } catch (e) { toast.error('Failed'); }
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-[#1a1f2e] rounded-xl p-8 border border-[#2a3042]">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#2e7d32]/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
            <p className="text-gray-400 text-sm">Enter your admin token to continue</p>
          </div>
          <input
            type="password" value={token} onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} placeholder="Admin token"
            className="w-full px-4 py-3 bg-[#2a2f3f] rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-[#2e7d32]"
          />
          <button onClick={login} className="w-full py-3 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22] transition-colors">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 p-4 bg-gradient-to-r from-[#2e7d32]/20 to-transparent border border-[#2e7d32]/30 rounded-lg flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome, Admin</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage matches, odds, scores, and predictions</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('adminToken'); setAuthed(false); setToken(''); }}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-[#1a1f2e] border border-[#2a3042] rounded-lg"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('matches')} className={`px-4 py-2 rounded-lg ${tab === 'matches' ? 'bg-[#2e7d32] text-white' : 'bg-[#1a1f2e] text-gray-400'}`}>Matches</button>
          <button onClick={() => setTab('predictions')} className={`px-4 py-2 rounded-lg ${tab === 'predictions' ? 'bg-[#2e7d32] text-white' : 'bg-[#1a1f2e] text-gray-400'}`}>Predictions</button>
        </div>

        {tab === 'matches' && (
          <>
            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2a3042] mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Create Match</h2>
              <p className="text-xs text-gray-500 mb-4">
                Times are shown in <strong className="text-gray-300">your local timezone</strong>. The match will kick off
                at exactly this time and play out to the score you set. After creating, expand <strong className="text-gray-300">📋 Markets</strong> on the row to tune every market.
              </p>
              <form onSubmit={createMatch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={form.sport} onChange={e => setForm({ ...form, sport: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white">
                  {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={form.league} onChange={e => setForm({ ...form, league: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white" required>
                  {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input placeholder="Home Team" value={form.homeTeam} onChange={e => setForm({ ...form, homeTeam: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white" required />
                <input placeholder="Away Team" value={form.awayTeam} onChange={e => setForm({ ...form, awayTeam: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white" required />
                <input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white md:col-span-2" required />

                <div className="md:col-span-2 p-3 bg-[#0f1219] rounded-lg border border-[#2a3042]">
                  <div className="text-xs text-gray-400 mb-2 font-medium">Result — Winner &amp; Margin</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-gray-500 block mb-1">Winner</label>
                      <div className="flex gap-1">
                        {[{ key: 'HOME', label: 'Home' }, { key: 'DRAW', label: 'Draw' }, { key: 'AWAY', label: 'Away' }].map(w => (
                          <button key={w.key} type="button" onClick={() => applyWinnerMargin(w.key, form.margin)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${form.winner === w.key ? 'bg-[#2e7d32] text-white' : 'bg-[#2a2f3f] text-gray-400 hover:text-white'}`}>
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">{form.winner === 'DRAW' ? 'Score each side' : 'Margin'}</label>
                      <input type="number" min="0" max="20" value={form.margin} onChange={e => applyWinnerMargin(form.winner, e.target.value)} className="w-full px-3 py-2 bg-[#2a2f3f] rounded-lg text-white text-sm" />
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-400">
                    Final score preview: <span className="text-white font-mono">{form.finalHomeScore || '0'} - {form.finalAwayScore || '0'}</span>
                  </div>
                </div>

                <div className="md:col-span-2 p-3 bg-[#0f1219] rounded-lg border border-[#2a3042]">
                  <div className="text-xs text-gray-400 mb-2 font-medium">Base 1X2 Odds (decimal)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Home</label>
                      <input type="number" step="0.01" min="1.01" value={form.odds.home} onChange={e => setForm({ ...form, odds: { ...form.odds, home: e.target.value } })} className="w-full px-3 py-2 bg-[#2a2f3f] rounded-lg text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Draw</label>
                      <input type="number" step="0.01" min="1.01" value={form.odds.draw} onChange={e => setForm({ ...form, odds: { ...form.odds, draw: e.target.value } })} className="w-full px-3 py-2 bg-[#2a2f3f] rounded-lg text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-1">Away</label>
                      <input type="number" step="0.01" min="1.01" value={form.odds.away} onChange={e => setForm({ ...form, odds: { ...form.odds, away: e.target.value } })} className="w-full px-3 py-2 bg-[#2a2f3f] rounded-lg text-white text-sm" />
                    </div>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, odds: { ...DEFAULT_ODDS } })} className="mt-2 text-[11px] text-gray-400 hover:text-white underline">
                    Reset odds to defaults
                  </button>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4 p-3 bg-[#0f1219] rounded-lg border border-[#2a3042]">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Final Home Score</label>
                    <input type="number" min="0" max="20" value={form.finalHomeScore} onChange={e => setForm({ ...form, finalHomeScore: e.target.value })} className="w-full px-4 py-2 bg-[#2a2f3f] rounded-lg text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Final Away Score</label>
                    <input type="number" min="0" max="20" value={form.finalAwayScore} onChange={e => setForm({ ...form, finalAwayScore: e.target.value })} className="w-full px-4 py-2 bg-[#2a2f3f] rounded-lg text-white" />
                  </div>
                </div>

                <button type="submit" className="px-6 py-2 bg-[#2e7d32] text-white rounded-lg font-bold md:col-span-2">Create Match</button>
              </form>
            </div>

            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2a3042]">
              <h2 className="text-xl font-bold text-white mb-4">Recent Matches ({matches.length})</h2>
              <div className="space-y-3 max-h-[800px] overflow-y-auto">
                {matches.map(m => (
                  <MatchRow
                    key={m._id}
                    match={m}
                    onUpdate={updateScore}
                    onUpdateTime={updateTime}
                    onDelete={deleteMatch}
                    onPredict={(id) => setPredForm({ ...predForm, matchId: id })}
                    onSetTarget={setTarget}
                    onCopyLink={copyMatchLink}
                    onUpdateOdds={updateOdds}
                    onUpdateMarkets={updateMarkets}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'predictions' && (
          <>
            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2a3042] mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Generate Prediction Link</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select value={predForm.matchId || ''} onChange={e => setPredForm({ ...predForm, matchId: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white md:col-span-2">
                  <option value="">Select match...</option>
                  {matches.filter(m => m.status === 'SCHEDULED').map(m => (
                    <option key={m._id} value={m._id}>{m.homeTeam.name} vs {m.awayTeam.name} ({m.league})</option>
                  ))}
                </select>
                <select value={predForm.predictedWinner} onChange={e => setPredForm({ ...predForm, predictedWinner: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white">
                  <option value="HOME">Home Win</option>
                  <option value="DRAW">Draw</option>
                  <option value="AWAY">Away Win</option>
                </select>
                <input placeholder="Predicted score (e.g. 2-1)" value={predForm.predictedScore} onChange={e => setPredForm({ ...predForm, predictedScore: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white" />
                <textarea placeholder="Optional note" value={predForm.note} onChange={e => setPredForm({ ...predForm, note: e.target.value })} className="px-4 py-2 bg-[#2a2f3f] rounded-lg text-white md:col-span-2" rows={2} />
                <button onClick={generatePrediction} className="px-6 py-2 bg-[#2e7d32] text-white rounded-lg font-bold md:col-span-2">Generate + Copy Link</button>
              </div>
            </div>

            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2a3042]">
              <h2 className="text-xl font-bold text-white mb-4">Issued Predictions ({predictions.length})</h2>
              <div className="space-y-2">
                {predictions.map(p => (
                  <div key={p.slug} className="flex justify-between items-center p-3 bg-[#0f1219] rounded-lg">
                    <div className="text-sm">
                      <div className="text-white font-mono">{p.predictedScore} — {p.predictedWinner}</div>
                      <div className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/predict/${p.slug}`); toast.success('Copied'); }} className="px-3 py-1 bg-[#2a2f3f] text-white text-xs rounded">Copy</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchRow({ match, onUpdate, onUpdateTime, onDelete, onPredict, onSetTarget, onCopyLink, onUpdateOdds, onUpdateMarkets }) {
  const [home, setHome] = useState(match.score.home);
  const [away, setAway] = useState(match.score.away);
  const [status, setStatus] = useState(match.status);
  const [startsAt, setStartsAt] = useState(toLocalInput(match.startsAt));
  const [showMarkets, setShowMarkets] = useState(false);

  // Editable copy of every market
  const [allMarkets, setAllMarkets] = useState(() =>
    (match.markets || []).map(m => ({ name: m.name, odds: String(m.odds), isActive: m.isActive !== false }))
  );

  useEffect(() => { setStartsAt(toLocalInput(match.startsAt)); }, [match.startsAt]);
  useEffect(() => {
    setAllMarkets((match.markets || []).map(m => ({ name: m.name, odds: String(m.odds), isActive: m.isActive !== false })));
  }, [match._id, match.markets?.length, JSON.stringify(match.markets?.map(m => m.odds))]);

  const initial = getOddsFromMarkets(match);
  const [odds, setOdds] = useState({
    home: initial.home !== '' ? String(initial.home) : '',
    draw: initial.draw !== '' ? String(initial.draw) : '',
    away: initial.away !== '' ? String(initial.away) : '',
  });

  useEffect(() => {
    const fresh = getOddsFromMarkets(match);
    setOdds({
      home: fresh.home !== '' ? String(fresh.home) : '',
      draw: fresh.draw !== '' ? String(fresh.draw) : '',
      away: fresh.away !== '' ? String(fresh.away) : '',
    });
  }, [match._id, match.markets?.[0]?.odds, match.markets?.[1]?.odds, match.markets?.[2]?.odds]);

  const isScripted = match.source === 'admin-manual' && match.scriptedOutcome?.homeScore !== null;
  const target = match.scriptedOutcome;
  const hasOdds = odds.home !== '' || odds.draw !== '' || odds.away !== '';
  const oddsDirty =
    String(odds.home) !== String(initial.home ?? '') ||
    String(odds.draw) !== String(initial.draw ?? '') ||
    String(odds.away) !== String(initial.away ?? '');
  const timeDirty = startsAt !== toLocalInput(match.startsAt);
  const canEditTime = match.status === 'SCHEDULED';

  // Group markets for display
  const grouped = {};
  for (const m of allMarkets) {
    const g = marketGroup(m.name);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(m);
  }
  const groupsInOrder = GROUP_ORDER.filter(g => grouped[g]?.length);

  const marketsDirty = JSON.stringify(
    allMarkets.map(m => ({ n: m.name, o: m.odds, a: m.isActive }))
  ) !== JSON.stringify(
    (match.markets || []).map(m => ({ n: m.name, o: String(m.odds), a: m.isActive !== false }))
  );

  const setMarketOdds = (name, value) => {
    setAllMarkets(prev => prev.map(m => m.name === name ? { ...m, odds: value } : m));
  };

  const marketCount = (match.markets || []).length;

  return (
    <div className="flex flex-col gap-3 p-3 bg-[#0f1219] rounded-lg border border-[#1f2535]">

      {/* Row 1 — teams / score / status / actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 text-sm min-w-0">
          <div className="text-white font-medium truncate flex items-center gap-2 flex-wrap">
            {match.homeTeam.name} vs {match.awayTeam.name}
            {isScripted && (
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                🎯 {target.homeScore}-{target.awayScore}
              </span>
            )}
            <span className="text-[10px] bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">
              {marketCount} markets
            </span>
          </div>
          <div className="text-xs text-gray-500 truncate">
            {match.league} • {new Date(match.startsAt).toLocaleString()} • {match.status}
            {match.minute > 0 && ` • ${match.minute}'`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" value={home} onChange={e => setHome(e.target.value)} className="w-14 px-2 py-1 bg-[#2a2f3f] rounded text-white text-sm" />
          <span className="text-gray-500">-</span>
          <input type="number" value={away} onChange={e => setAway(e.target.value)} className="w-14 px-2 py-1 bg-[#2a2f3f] rounded text-white text-sm" />
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-2 py-1 bg-[#2a2f3f] rounded text-white text-xs">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => onUpdate(match, Number(home), Number(away), status)} className="px-2 py-1 bg-[#2e7d32] text-white text-xs rounded">Save</button>
          <button onClick={() => onSetTarget(match._id, Number(home), Number(away))} className="px-2 py-1 bg-purple-600 text-white text-xs rounded" title="Set target score">🎯 Target</button>
          <button onClick={() => onPredict(match._id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Predict</button>
          <button onClick={() => onCopyLink(match)} className="px-2 py-1 bg-amber-600 text-white text-xs rounded" title="Copy public match link">🔗 Link</button>
          <button onClick={() => onDelete(match._id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Del</button>
        </div>
      </div>

      {/* Row 2 — base 1X2 + Markets toggle */}
      <div className="flex flex-wrap items-center gap-2 pl-1">
        <span className="text-[11px] text-gray-500 uppercase tracking-wide">Base 1X2</span>
        <input type="number" step="0.01" min="1.01" placeholder="1" value={odds.home} onChange={e => setOdds({ ...odds, home: e.target.value })} className="w-16 px-2 py-1 bg-[#2a2f3f] rounded text-white text-xs" />
        <input type="number" step="0.01" min="1.01" placeholder="X" value={odds.draw} onChange={e => setOdds({ ...odds, draw: e.target.value })} className="w-16 px-2 py-1 bg-[#2a2f3f] rounded text-white text-xs" />
        <input type="number" step="0.01" min="1.01" placeholder="2" value={odds.away} onChange={e => setOdds({ ...odds, away: e.target.value })} className="w-16 px-2 py-1 bg-[#2a2f3f] rounded text-white text-xs" />
        <button onClick={() => onUpdateOdds(match, odds)} disabled={!oddsDirty}
          className={`px-2 py-1 text-xs rounded ${oddsDirty ? 'bg-[#2e7d32] text-white' : 'bg-[#2a2f3f] text-gray-500 cursor-not-allowed'}`}>
          Save Base
        </button>
        <button
          onClick={() => setShowMarkets(v => !v)}
          className="px-2 py-1 text-xs rounded bg-[#0d4f6e] text-white hover:bg-[#0a3f58]"
        >
          {showMarkets ? '▲ Hide Markets' : `▼ 📋 Markets (${marketCount})`}
        </button>
      </div>

      {/* Row 3 — start time */}
      <div className="flex flex-wrap items-center gap-2 pl-1">
        <span className="text-[11px] text-gray-500 uppercase tracking-wide">Start time</span>
        <input
          type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
          disabled={!canEditTime}
          className={`px-2 py-1 bg-[#2a2f3f] rounded text-white text-xs ${canEditTime ? '' : 'opacity-50 cursor-not-allowed'}`}
        />
        <button onClick={() => onUpdateTime(match, startsAt)} disabled={!timeDirty || !canEditTime}
          className={`px-2 py-1 text-xs rounded ${
            timeDirty && canEditTime ? 'bg-[#2e7d32] text-white' : 'bg-[#2a2f3f] text-gray-500 cursor-not-allowed'
          }`}>
          Save Time
        </button>
        <span className="text-[10px] text-gray-600">
          {canEditTime ? 'Your local time' : `Locked — match is ${match.status}`}
        </span>
      </div>

      {/* ─── EXPANDED: full market board ─── */}
      {showMarkets && (
        <div className="mt-1 p-3 bg-[#0a0e16] rounded-lg border border-[#1f2535] space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Edit any market's odds. Press <strong className="text-white">Save Markets</strong> to publish.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAllMarkets((match.markets || []).map(m => ({ name: m.name, odds: String(m.odds), isActive: m.isActive !== false })))}
                className="px-2 py-1 text-[11px] rounded bg-[#2a2f3f] text-gray-300 hover:text-white"
              >
                Reset
              </button>
              <button
                onClick={() => onUpdateMarkets(match, allMarkets)}
                disabled={!marketsDirty}
                className={`px-3 py-1 text-[11px] rounded font-bold ${
                  marketsDirty ? 'bg-[#2e7d32] text-white' : 'bg-[#2a2f3f] text-gray-500 cursor-not-allowed'
                }`}
              >
                Save Markets
              </button>
            </div>
          </div>

          {groupsInOrder.map(groupName => (
            <div key={groupName}>
              <div className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase mb-2">
                {groupName}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {grouped[groupName].map(m => (
                  <div key={m.name} className="flex items-center justify-between gap-1 px-2 py-1 bg-[#141a26] rounded border border-[#1f2535]">
                    <span className="text-[10px] text-gray-300 truncate" title={m.name}>{m.name}</span>
                    <input
                      type="number" step="0.01" min="1.01"
                      value={m.odds}
                      onChange={e => setMarketOdds(m.name, e.target.value)}
                      className="w-14 px-1 py-0.5 bg-[#0a0e16] rounded text-white text-[11px] text-right tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {allMarkets.length === 0 && (
            <div className="text-center text-gray-500 text-xs py-4">
              This match has no markets. It was probably created before the extended board was added. Delete it and create a new one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}