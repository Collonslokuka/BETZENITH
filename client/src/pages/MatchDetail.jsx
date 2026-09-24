// src/pages/MatchDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatch } from '../services/api';
import BetSlip from '../components/BetSlip';
import { useBetSlip } from '../context/BetSlipContext';

// ─── market grouping helpers ───
const WINNER = ['1', 'X', '2', 'Home', 'Away'];
const isDC    = n => n.startsWith('Double Chance');
const isTotal = n => /^(Over|Under)\s/.test(n) && !n.includes('&');
const isBTTS  = n => n === 'BTTS' || n === 'BTTS No';
const isCombo = n => n.includes('&') && !isDC(n);
const isCS    = n => /^\d+:\d+$/.test(n);

function pretty(name) {
  if (name === '1') return 'Home';
  if (name === '2') return 'Away';
  if (name === 'X') return 'Draw';
  return name;
}

function groupMarkets(markets = []) {
  return {
    winner: markets.filter(m => WINNER.includes(m.name)),
    dc:     markets.filter(m => isDC(m.name)),
    totals: markets.filter(m => isTotal(m.name)),
    btts:   markets.filter(m => isBTTS(m.name)),
    combos: markets.filter(m => isCombo(m.name)),
    cs:     markets.filter(m => isCS(m.name)),
  };
}

// ─── small components ───
function OddsButton({ market, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm bg-[#1a1f2e] text-gray-200 hover:bg-[#232a3d] border border-[#2a3042] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="truncate">{pretty(market.name)}</span>
      <span className="font-bold tabular-nums text-emerald-400">
        {Number(market.odds).toFixed(2)}
      </span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-bold tracking-wider text-gray-400 mb-2 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── page ───
export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToBetSlip } = useBetSlip();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getMatch(id)
      .then(data => { if (alive) setMatch(data); })
      .catch(err => console.error('Error loading match:', err))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const grouped = useMemo(() => groupMarkets(match?.markets), [match]);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading match details...</div>;
  }
  if (!match) {
    return <div className="text-center py-12 text-gray-400">Match not found</div>;
  }

  const bettingClosed = match.status === 'FINISHED' || match.status === 'CANCELLED';

  const handlePick = (market) => {
    if (bettingClosed || !market.isActive) return;
    addToBetSlip({
      ...match,
      selectedMarket: { ...market, index: match.markets.indexOf(market) },
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* ─── MAIN COLUMN ─── */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="bg-[#1a1f2e] rounded-lg p-4 sm:p-6 mb-4">
          <h1 className="text-lg sm:text-2xl font-bold text-white mb-1 break-words">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </h1>
          <p className="text-gray-400 text-sm mb-4">{match.league}</p>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
            <div>
              <div className="text-xl sm:text-3xl font-bold text-white">
                {match.homeTeam.abbreviation}
              </div>
              <div className="text-xs text-gray-400">Home</div>
            </div>
            <div>
              <div className="text-base sm:text-xl text-[#00b3b3] font-bold tabular-nums">
                {match.score
                  ? `${match.score.home ?? 0} - ${match.score.away ?? 0}`
                  : match.time}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(match.date).toLocaleDateString()}
                {match.minute > 0 && ` • ${match.minute}'`}
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold text-white">
                {match.awayTeam.abbreviation}
              </div>
              <div className="text-xs text-gray-400">Away</div>
            </div>
          </div>
        </div>

        {/* Markets */}
        <div className="bg-[#1a1f2e] rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Markets</h2>

          {grouped.winner.length > 0 && (
            <Section title="Match Winner">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.winner.map((m, i) => (
                  <OddsButton
                    key={`${m.name}-${i}`}
                    market={m}
                    onClick={() => handlePick(m)}
                    disabled={bettingClosed || !m.isActive}
                  />
                ))}
              </div>
            </Section>
          )}

          {grouped.dc.length > 0 && (
            <Section title="Double Chance">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.dc.map((m, i) => (
                  <OddsButton
                    key={`${m.name}-${i}`}
                    market={m}
                    onClick={() => handlePick(m)}
                    disabled={bettingClosed || !m.isActive}
                  />
                ))}
              </div>
            </Section>
          )}

          {grouped.totals.length > 0 && (
            <Section title="Total Goals">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.totals.map((m, i) => (
                  <OddsButton
                    key={`${m.name}-${i}`}
                    market={m}
                    onClick={() => handlePick(m)}
                    disabled={bettingClosed || !m.isActive}
                  />
                ))}
              </div>
            </Section>
          )}

          {grouped.btts.length > 0 && (
            <Section title="Both Teams to Score">
              <div className="grid grid-cols-2 gap-2">
                {grouped.btts.map((m, i) => (
                  <OddsButton
                    key={`${m.name}-${i}`}
                    market={m}
                    onClick={() => handlePick(m)}
                    disabled={bettingClosed || !m.isActive}
                  />
                ))}
              </div>
            </Section>
          )}

          {grouped.combos.length > 0 && (
            <Section title="Combinations">
              <div className="grid grid-cols-2 gap-2">
                {grouped.combos.map((m, i) => (
                  <OddsButton
                    key={`${m.name}-${i}`}
                    market={m}
                    onClick={() => handlePick(m)}
                    disabled={bettingClosed || !m.isActive}
                  />
                ))}
              </div>
            </Section>
          )}

          {grouped.cs.length > 0 && (
            <Section title="Correct Score">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {grouped.cs.map((m, i) => (
                  <OddsButton
                    key={`${m.name}-${i}`}
                    market={m}
                    onClick={() => handlePick(m)}
                    disabled={bettingClosed || !m.isActive}
                  />
                ))}
              </div>
            </Section>
          )}

          {(!match.markets || match.markets.length === 0) && (
            <div className="text-center text-gray-500 text-sm py-6">
              No markets available yet.
            </div>
          )}
        </div>
      </div>

      {/* ─── DESKTOP SIDEBAR (hidden on phones) ─── */}
      <aside className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-4">
          <BetSlip />
        </div>
      </aside>

      {/* ─── MOBILE FLOATING BUTTON ─── */}
      <Link
        to="/bet-slip"
        className="lg:hidden fixed bottom-4 right-4 z-40 px-4 py-3 rounded-full bg-[#2e7d32] text-white font-bold shadow-lg"
      >
        Bet Slip
      </Link>
    </div>
  );
}