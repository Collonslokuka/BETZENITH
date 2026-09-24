// src/pages/PredictionView.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/axios';
import toast from 'react-hot-toast';

// ---------- helpers ----------
const WINNER = ['1', 'X', '2', 'Home', 'Away'];
const DC     = n => n.startsWith('Double Chance');
const TOTAL  = n => /^(Over|Under)\s/.test(n) && !n.includes('&');
const BTTS   = n => n === 'BTTS' || n === 'BTTS No';
const COMBO  = n => n.includes('&') && !DC(n);
const CS     = n => /^\d+:\d+$/.test(n);

function pretty(name) {
  if (name === '1') return 'Home';
  if (name === '2') return 'Away';
  if (name === 'X') return 'Draw';
  return name;
}

function sectionsFor(markets) {
  const winner = markets.filter(m => WINNER.includes(m.name));
  const dc     = markets.filter(m => DC(m.name));
  const totals = markets.filter(m => TOTAL(m.name));
  const btts   = markets.filter(m => BTTS(m.name));
  const combos = markets.filter(m => COMBO(m.name));
  const cs     = markets.filter(m => CS(m.name));
  return { winner, dc, totals, btts, combos, cs };
}

// ---------- subcomponents ----------
function OddsButton({ market, selected, onPick }) {
  const isSel = selected?.name === market.name;
  return (
    <button
      type="button"
      onClick={() => onPick(market)}
      className={[
        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors',
        isSel
          ? 'bg-[#2e7d32] text-white ring-2 ring-[#2e7d32]'
          : 'bg-[#1a1f2e] text-gray-200 hover:bg-[#232a3d] border border-[#2a3042]',
      ].join(' ')}
    >
      <span className="truncate">{pretty(market.name)}</span>
      <span className={`font-bold tabular-nums ${isSel ? 'text-white' : 'text-emerald-400'}`}>
        {Number(market.odds).toFixed(2)}
      </span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-bold tracking-wider text-gray-400 mb-2 uppercase">{title}</h3>
      {children}
    </div>
  );
}

// ---------- main ----------
export default function PredictionView() {
  const { slug } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [slip, setSlip]       = useState([]);
  const [stake, setStake]     = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin-panel/predict/${slug}`)
      .then(r => setData(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const markets = data?.match?.markets || [];
  const grouped = useMemo(() => sectionsFor(markets), [markets]);

  const isSelected = (m) => slip.some(s => s.name === m.name);
  const togglePick = (m) => {
    setSlip(prev => prev.some(s => s.name === m.name)
      ? prev.filter(s => s.name !== m.name)
      : [...prev, m]
    );
  };

  const totalOdds = slip.length === 0
    ? 0
    : slip.reduce((acc, s) => acc * Number(s.odds), 1);
  const potentialWin = (Number(stake) || 0) * totalOdds;

  const placeBet = async () => {
    if (slip.length === 0) return toast.error('Pick at least one market');
    if (!stake || Number(stake) < 500) return toast.error('Min stake KSh 500');
    setPlacing(true);
    try {
      await api.post('/bets', {
        matchId: data.match._id,
        selections: slip.map(s => ({ name: s.name, odds: s.odds })),
        stake: Number(stake),
      });
      toast.success('Bet placed!');
      setSlip([]);
      setStake('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to place bet');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (error) return (
    <div className="max-w-md mx-auto py-20 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <Link to="/" className="text-[#2e7d32]">Home</Link>
    </div>
  );

  const { prediction, match } = data;
  const winnerLabel = prediction.predictedWinner === 'HOME' ? match.homeTeam.name
                    : prediction.predictedWinner === 'AWAY' ? match.awayTeam.name
                    : 'Draw';

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">

        {/* Demo warning banner — unchanged */}
        <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs text-center font-bold">⚠️ DEMO PREDICTION — Not affiliated with any real betting service</p>
        </div>

        {/* Prediction card — unchanged content, responsive sizing */}
        <div className="bg-[#1a1f2e] rounded-2xl p-5 sm:p-8 border-2 border-[#2e7d32]/30 mb-6">
          <div className="text-center mb-6">
            <span className="text-xs bg-[#2e7d32]/10 text-[#2e7d32] px-3 py-1 rounded-full">AI PREDICTION</span>
          </div>

          <div className="text-center mb-8">
            <div className="text-sm text-gray-500 mb-2">{match.league}</div>
            <div className="text-xl sm:text-3xl font-bold text-white mb-2 break-words">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </div>
            <div className="text-sm text-gray-400">{new Date(match.startsAt).toLocaleString()}</div>
          </div>

          <div className="bg-[#0f1219] rounded-xl p-6 mb-6 text-center">
            <div className="text-xs text-gray-500 mb-2">PREDICTED RESULT</div>
            <div className="text-2xl font-bold text-[#2e7d32] mb-1">{prediction.predictedScore}</div>
            <div className="text-lg text-white">{winnerLabel} to win</div>
          </div>

          {prediction.note && (
            <div className="bg-[#0f1219] rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-500 mb-1">ANALYSIS</div>
              <div className="text-sm text-gray-300">{prediction.note}</div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            Issued {new Date(prediction.issuedAt).toLocaleString()}
          </div>
        </div>

        {/* Market board + bet slip */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

          {/* Markets — 2/3 on desktop */}
          <div className="lg:col-span-2 space-y-1">

            {grouped.winner.length > 0 && (
              <Section title="Match Winner">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped.winner.map(m => (
                    <OddsButton key={m.name} market={m} selected={isSelected(m)} onPick={togglePick} />
                  ))}
                </div>
              </Section>
            )}

            {grouped.dc.length > 0 && (
              <Section title="Double Chance">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped.dc.map(m => (
                    <OddsButton key={m.name} market={m} selected={isSelected(m)} onPick={togglePick} />
                  ))}
                </div>
              </Section>
            )}

            {grouped.totals.length > 0 && (
              <Section title="Total Goals">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grouped.totals.map(m => (
                    <OddsButton key={m.name} market={m} selected={isSelected(m)} onPick={togglePick} />
                  ))}
                </div>
              </Section>
            )}

            {grouped.btts.length > 0 && (
              <Section title="Both Teams to Score">
                <div className="grid grid-cols-2 gap-2">
                  {grouped.btts.map(m => (
                    <OddsButton key={m.name} market={m} selected={isSelected(m)} onPick={togglePick} />
                  ))}
                </div>
              </Section>
            )}

            {grouped.combos.length > 0 && (
              <Section title="Combinations">
                <div className="grid grid-cols-2 gap-2">
                  {grouped.combos.map(m => (
                    <OddsButton key={m.name} market={m} selected={isSelected(m)} onPick={togglePick} />
                  ))}
                </div>
              </Section>
            )}

            {grouped.cs.length > 0 && (
              <Section title="Correct Score">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {grouped.cs.map(m => (
                    <OddsButton key={m.name} market={m} selected={isSelected(m)} onPick={togglePick} />
                  ))}
                </div>
              </Section>
            )}

            {markets.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                No markets available for this match yet.
              </div>
            )}
          </div>

          {/* Bet slip — sticky on desktop */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <div className="rounded-xl bg-[#1a1f2e] border border-[#2a3042] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">Bet Slip</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3042] text-gray-300">
                    {slip.length} {slip.length === 1 ? 'pick' : 'picks'}
                  </span>
                </div>

                {slip.length === 0 ? (
                  <div className="text-xs text-gray-500 py-6 text-center">
                    Tap any odds to add to your slip.
                  </div>
                ) : (
                  <div className="space-y-2 mb-3 max-h-64 overflow-y-auto pr-1">
                    {slip.map(s => (
                      <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-[#0f1219] border border-[#222839]">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400 truncate">
                            {match.homeTeam.name} vs {match.awayTeam.name}
                          </div>
                          <div className="text-sm truncate">{pretty(s.name)}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-400 font-bold tabular-nums">@{Number(s.odds).toFixed(2)}</span>
                          <button
                            onClick={() => togglePick(s)}
                            className="text-gray-500 hover:text-red-400 text-xs"
                            aria-label="Remove"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-[#2a3042]">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Total Odds</span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      {totalOdds ? totalOdds.toFixed(4) : '—'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">
                      Stake (KSh)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="500"
                      placeholder="Min 500"
                      value={stake}
                      onChange={e => setStake(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0f1219] border border-[#222839] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2e7d32]"
                    />
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Potential Win</span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      KSh {potentialWin ? potentialWin.toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <button
                    disabled={placing || slip.length === 0}
                    onClick={placeBet}
                    className="w-full py-3 rounded-lg font-bold bg-[#2e7d32] hover:bg-[#256c2b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {placing ? 'Placing…' : `Place Bet${slip.length > 1 ? ' (Parlay)' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link to="/" className="block text-center mt-8 text-[#2e7d32] text-sm">← Back to BetZenith</Link>

        {/* Sticky mobile Place Bet bar */}
        {slip.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#2a3042] bg-[#1a1f2e]/95 backdrop-blur px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-400">
                {slip.length} {slip.length === 1 ? 'selection' : 'selections'}
              </div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums">@{totalOdds.toFixed(2)}</div>
            </div>
            <button
              onClick={placeBet}
              disabled={placing}
              className="px-4 py-2 rounded-lg bg-[#2e7d32] text-white font-bold text-sm"
            >
              Place Bet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}