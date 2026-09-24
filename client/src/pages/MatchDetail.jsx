// src/pages/MatchDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatch } from '../services/api';
import BetSlip from '../components/BetSlip';
import { useBetSlip } from '../context/BetSlipContext';

// ─── grouping ───
const WINNER       = ['1', 'X', '2', 'Home', 'Away'];
const isDC         = n => n.startsWith('Double Chance');
const isTotal      = n => /^(Over|Under)\s/.test(n) && !n.includes('&') && !n.startsWith('1H ');
const isBTTS       = n => n === 'BTTS' || n === 'BTTS No';
const isComboBtts  = n => /^[1X2] & BTTS/.test(n);
const isComboTotal = n => /^[1X2] & (Over|Under)/.test(n);
const isCS         = n => /^\d+:\d+$/.test(n) || n === 'Other';
const isHTFT       = n => /^[1X2]\/[1X2]$/.test(n);
const is1H1X2      = n => /^1H [1X2]$/.test(n);
const is1HTotal    = n => /^1H (Over|Under)/.test(n);
const is1HBTTS     = n => n === '1H BTTS' || n === '1H BTTS No';
const is1HCS       = n => /^1H \d+:\d+$/.test(n) || n === '1H Other';

function pretty(name) {
  if (name === '1') return 'Home';
  if (name === '2') return 'Away';
  if (name === 'X') return 'Draw';
  return name;
}

function groupMarkets(markets = []) {
  return {
    winner:    markets.filter(m => WINNER.includes(m.name)),
    dc:        markets.filter(m => isDC(m.name)),
    totals:    markets.filter(m => isTotal(m.name)),
    btts:      markets.filter(m => isBTTS(m.name)),
    combos:    markets.filter(m => isComboBtts(m.name) || isComboTotal(m.name)),
    cs:        markets.filter(m => isCS(m.name)),
    htft:      markets.filter(m => isHTFT(m.name)),
    oneH1x2:   markets.filter(m => is1H1X2(m.name)),
    oneHTotal: markets.filter(m => is1HTotal(m.name)),
    oneHBtts:  markets.filter(m => is1HBTTS(m.name)),
    oneHCs:    markets.filter(m => is1HCS(m.name)),
  };
}

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
      <h3 className="text-[11px] font-bold tracking-wider text-gray-400 mb-2 uppercase">{title}</h3>
      {children}
    </div>
  );
}

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

  if (loading) return <div className="text-center py-12 text-gray-400">Loading match details...</div>;
  if (!match)   return <div className="text-center py-12 text-gray-400">Match not found</div>;

  const bettingClosed = ['FINISHED', 'CANCELLED', 'POSTPONED', 'ABANDONED'].includes(match.status);
  const kickoffDate = new Date(match.startsAt || match.date);

  const handlePick = (market) => {
    if (bettingClosed || !market.isActive) return;
    addToBetSlip({
      ...match,
      selectedMarket: { ...market, index: match.markets.indexOf(market) },
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 min-w-0">

        {/* ─── HEADER with PROMINENT DATE / KICKOFF ─── */}
        <div className="bg-[#1a1f2e] rounded-lg p-4 sm:p-6 mb-4 border border-[#2a3042]">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>{match.league}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              match.status === 'FINISHED' ? 'bg-gray-500/20 text-gray-400'
              : match.status === 'SCHEDULED' ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
            }`}>
              {match.status}
            </span>
          </div>

          <h1 className="text-lg sm:text-2xl font-bold text-white mb-4 break-words">
            {match.homeTeam.name} <span className="text-gray-500 mx-1">vs</span> {match.awayTeam.name}
          </h1>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center mb-4">
            <div>
              <div className="text-xl sm:text-3xl font-bold text-white">
                {match.homeTeam.abbreviation}
              </div>
              <div className="text-xs text-gray-400">Home</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-bold tabular-nums text-[#00b3b3]">
                {match.status === 'SCHEDULED'
                  ? 'VS'
                  : `${match.score?.home ?? 0} - ${match.score?.away ?? 0}`}
              </div>
              {match.minute > 0 && (
                <div className="text-xs text-red-400 font-bold mt-1">LIVE • {match.minute}'</div>
              )}
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold text-white">
                {match.awayTeam.abbreviation}
              </div>
              <div className="text-xs text-gray-400">Away</div>
            </div>
          </div>

          {/* ── PROMINENT KICKOFF DATE / TIME ── */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#0f1219] rounded-lg border border-[#2a3042]">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Date</div>
              <div className="text-sm sm:text-base font-bold text-white">
                {kickoffDate.toLocaleDateString(undefined, {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Kickoff (your time)</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">
                {kickoffDate.toLocaleTimeString(undefined, {
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ─── MARKETS ─── */}
        <div className="bg-[#1a1f2e] rounded-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Markets</h2>

          {grouped.winner.length > 0 && (
            <Section title="Match Winner — Full Time">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.winner.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.dc.length > 0 && (
            <Section title="Double Chance">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.dc.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.totals.length > 0 && (
            <Section title="Total Goals">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.totals.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.btts.length > 0 && (
            <Section title="Both Teams to Score (GG / NG)">
              <div className="grid grid-cols-2 gap-2">
                {grouped.btts.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.combos.length > 0 && (
            <Section title="1X2 & Total / BTTS">
              <div className="grid grid-cols-2 gap-2">
                {grouped.combos.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.cs.length > 0 && (
            <Section title="Correct Score">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {grouped.cs.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.htft.length > 0 && (
            <Section title="Halftime / Fulltime">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.htft.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.oneH1x2.length > 0 && (
            <Section title="1st Half — 1X2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.oneH1x2.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.oneHTotal.length > 0 && (
            <Section title="1st Half — Total">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {grouped.oneHTotal.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.oneHBtts.length > 0 && (
            <Section title="1st Half — Both Teams to Score">
              <div className="grid grid-cols-2 gap-2">
                {grouped.oneHBtts.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {grouped.oneHCs.length > 0 && (
            <Section title="1st Half — Correct Score">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {grouped.oneHCs.map((m, i) => (
                  <OddsButton key={`${m.name}-${i}`} market={m} onClick={() => handlePick(m)} disabled={bettingClosed || !m.isActive} />
                ))}
              </div>
            </Section>
          )}

          {(!match.markets || match.markets.length === 0) && (
            <div className="text-center text-gray-500 text-sm py-6">No markets available yet.</div>
          )}
        </div>
      </div>

      <aside className="hidden lg:block w-80 shrink-0">
        <div className="sticky top-4"><BetSlip /></div>
      </aside>

      <Link
        to="/bet-slip"
        className="lg:hidden fixed bottom-4 right-4 z-40 px-4 py-3 rounded-full bg-[#2e7d32] text-white font-bold shadow-lg"
      >
        Bet Slip
      </Link>
    </div>
  );
}