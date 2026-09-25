// src/pages/MyBets.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyBets } from '../services/api';
import { format } from 'date-fns';
import {
  FiTrendingUp, FiClock, FiCheckCircle, FiXCircle, FiDollarSign,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// Compute a clear outcome from the bet + its selections
function getOutcome(bet) {
  const selections = bet.selections || [];
  const won = selections.filter(s => s.status === 'WON').length;
  const lost = selections.filter(s => s.status === 'LOST').length;
  const pending = selections.filter(s => s.status === 'PENDING').length;
  const settled = won + lost;
  const total = selections.length || 1;

  // Final states (already settled by backend)
  if (bet.status === 'WON') {
    return {
      key: 'WON',
      label: 'WON',
      icon: 'check',
      bg: 'bg-green-500/10',
      border: 'border-green-500/40',
      text: 'text-green-400',
      dot: 'bg-green-500',
      amountLabel: 'Payout',
      amount: Number(bet.winnings ?? bet.potentialWin ?? 0),
      amountColor: 'text-green-400',
    };
  }
  if (bet.status === 'LOST') {
    return {
      key: 'LOST',
      label: 'LOST',
      icon: 'x',
      bg: 'bg-red-500/10',
      border: 'border-red-500/40',
      text: 'text-red-400',
      dot: 'bg-red-500',
      amountLabel: 'Lost',
      amount: Number(bet.stake || 0),
      amountColor: 'text-red-400',
    };
  }
  if (bet.status === 'VOID' || bet.status === 'REFUNDED') {
    return {
      key: 'VOID',
      label: 'VOID',
      icon: 'clock',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/40',
      text: 'text-gray-300',
      dot: 'bg-gray-400',
      amountLabel: 'Refund',
      amount: Number(bet.stake || 0),
      amountColor: 'text-gray-300',
    };
  }
  if (bet.status === 'CASHED_OUT') {
    return {
      key: 'CASHED_OUT',
      label: 'CASHED OUT',
      icon: 'check',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/40',
      text: 'text-blue-400',
      dot: 'bg-blue-500',
      amountLabel: 'Cashout',
      amount: Number(bet.cashoutAmount || bet.stake || 0),
      amountColor: 'text-blue-400',
    };
  }

  // Still PENDING per backend — but the selections tell the real story
  if (lost > 0) {
    return {
      key: 'LOST_LIVE',
      label: 'LOST',
      icon: 'x',
      bg: 'bg-red-500/10',
      border: 'border-red-500/40',
      text: 'text-red-400',
      dot: 'bg-red-500',
      sub: `${won}W · ${lost}L`,
      amountLabel: 'Lost',
      amount: Number(bet.stake || 0),
      amountColor: 'text-red-400',
    };
  }
  if (pending === 0 && won === total) {
    return {
      key: 'WON_LIVE',
      label: 'WON',
      icon: 'check',
      bg: 'bg-green-500/10',
      border: 'border-green-500/40',
      text: 'text-green-400',
      dot: 'bg-green-500',
      sub: 'Awaiting payout',
      amountLabel: 'Payout',
      amount: Number(bet.winnings ?? bet.potentialWin ?? 0),
      amountColor: 'text-green-400',
    };
  }
  return {
    key: 'AWAITING',
    label: 'Awaiting result',
    icon: 'clock',
    bg: 'bg-[#1a1f2e]',
    border: 'border-[#2a3042]',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
    sub: settled > 0 ? `${won}W · ${pending} awaiting` : `${pending} selection${pending > 1 ? 's' : ''}`,
    amountLabel: 'To win',
    amount: Number(bet.potentialWin || 0),
    amountColor: 'text-emerald-400',
  };
}

function StatusIcon({ icon, className }) {
  if (icon === 'check') return <FiCheckCircle className={className} />;
  if (icon === 'x') return <FiXCircle className={className} />;
  if (icon === 'clock') return <FiClock className={className} />;
  return <FiTrendingUp className={className} />;
}

export default function MyBets() {
  const { user, isAuthenticated } = useAuth();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    pendingBets: 0,
    totalStake: 0,
    totalWinnings: 0,
    profit: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to view your bets');
      return;
    }
    loadBets();
  }, [isAuthenticated]);

  const loadBets = async () => {
    try {
      const data = await getMyBets();
      const betsData = Array.isArray(data) ? data : data?.data || [];
      setBets(betsData);

      const totalBets = betsData.length;
      const wonBets = betsData.filter(b => b.status === 'WON').length;
      const lostBets = betsData.filter(b => b.status === 'LOST').length;
      const pendingBets = betsData.filter(b => b.status === 'PENDING').length;
      const totalStake = betsData.reduce((sum, b) => sum + (b.stake || 0), 0);
      const totalWinnings = betsData
        .filter(b => b.status === 'WON')
        .reduce((sum, b) => sum + (b.winnings ?? b.potentialWin ?? 0), 0);

      setStats({
        totalBets,
        wonBets,
        lostBets,
        pendingBets,
        totalStake,
        totalWinnings,
        profit: totalWinnings - totalStake,
      });
    } catch (error) {
      console.error('Error loading bets:', error);
      toast.error('Failed to load bets');
    } finally {
      setLoading(false);
    }
  };

  const filteredBets = bets.filter(bet => {
    if (filter === 'ALL') return true;
    if (filter === 'AWAITING') {
      // Treat live-lost/live-won as still awaiting from the backend's POV
      return bet.status === 'PENDING';
    }
    return bet.status === filter;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f1117] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-[#1a1f2e] rounded-lg p-8 text-center">
            <FiTrendingUp className="text-6xl text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">My Bets</h1>
            <p className="text-gray-400 mb-6">Please login to view your betting history</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22]"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-3xl">

        {/* Header */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 sm:p-5 border border-[#2a3042] mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">My Bets</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your betting activity</p>
            </div>
            <button
              onClick={loadBets}
              className="px-3 py-1.5 rounded-lg bg-[#2a3042] text-gray-300 text-xs font-medium hover:bg-[#353b4d] transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3042]">
            <p className="text-gray-400 text-xs">Total Bets</p>
            <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalBets}</p>
          </div>
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3042]">
            <p className="text-gray-400 text-xs">Win Rate</p>
            <p className="text-lg sm:text-2xl font-bold text-green-400">
              {stats.totalBets > 0 ? ((stats.wonBets / stats.totalBets) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-gray-500">{stats.wonBets}W / {stats.lostBets}L</p>
          </div>
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3042]">
            <p className="text-gray-400 text-xs">Total Stake</p>
            <p className="text-lg sm:text-2xl font-bold text-white truncate">
              KSh {stats.totalStake.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'All', dot: null },
            { key: 'AWAITING', label: 'Awaiting', dot: 'bg-yellow-400' },
            { key: 'WON', label: 'Won', dot: 'bg-green-500' },
            { key: 'LOST', label: 'Lost', dot: 'bg-red-500' },
            { key: 'CASHED_OUT', label: 'Cashed Out', dot: 'bg-blue-500' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === f.key
                  ? 'bg-[#2e7d32] text-white'
                  : 'bg-[#1a1f2e] text-gray-400 hover:text-white border border-[#2a3042]'
              }`}
            >
              {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Bets List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading bets...</p>
          </div>
        ) : filteredBets.length === 0 ? (
          <div className="bg-[#1a1f2e] rounded-xl p-8 text-center border border-[#2a3042]">
            <FiTrendingUp className="text-5xl text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg text-white mb-2">No bets yet</h2>
            <p className="text-gray-400 mb-6 text-sm">Start betting on matches to see your history here</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22]"
            >
              Browse Matches
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBets.map(bet => {
              const outcome = getOutcome(bet);
              const betId = bet._id;
              const code = bet.reference || String(betId).slice(-10);
              const date = bet.createdAt ? format(new Date(bet.createdAt), 'MMM d, HH:mm') : '';

              const selections = bet.selections || [];
              const isMulti = selections.length > 1;
              const firstMatch = selections[0]?.match || bet.match || {};
              const home = firstMatch.homeTeam?.name || firstMatch.homeTeam?.abbreviation || 'Home';
              const away = firstMatch.awayTeam?.name || firstMatch.awayTeam?.abbreviation || 'Away';
              const matchLabel = isMulti
                ? `${selections.length} selections`
                : `${home} vs ${away}`;

              return (
                <Link
                  key={betId}
                  to={`/bet/${betId}`}
                  className={`block rounded-xl p-4 border ${outcome.bg} ${outcome.border} hover:brightness-110 transition-all`}
                >
                  {/* Row 1 — reference + date */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${outcome.dot}`} />
                      <span className="text-xs text-gray-400 font-mono truncate">{code}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{date}</span>
                  </div>

                  {/* Row 2 — match + type */}
                  <div className="mb-3">
                    <p className="text-sm sm:text-base font-semibold text-white truncate">
                      {matchLabel}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isMulti ? `Multi · ${selections.length} selections` : 'Single'}
                    </p>
                  </div>

                  {/* Row 3 — stake / odds / outcome amount */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Stake</p>
                      <p className="text-sm font-bold text-white">
                        KSh {Number(bet.stake || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Odds</p>
                      <p className="text-sm font-bold text-white">
                        @{Number(bet.totalOdds || 1).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">
                        {outcome.amountLabel}
                      </p>
                      <p className={`text-sm font-bold ${outcome.amountColor}`}>
                        KSh {outcome.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Row 4 — big clear status bar */}
                  <div className={`flex items-center justify-between pt-3 border-t ${outcome.border}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon icon={outcome.icon} className={`${outcome.text} text-lg flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${outcome.text} truncate`}>
                          {outcome.label}
                        </p>
                        {outcome.sub && (
                          <p className="text-[10px] text-gray-400 truncate">{outcome.sub}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-500 text-lg flex-shrink-0">›</span>
                  </div>

                  {/* Cashout row — only when actually available */}
                  {bet.cashoutAvailable && !bet.cashoutTaken && bet.status === 'PENDING' && (
                    <div className="mt-3 pt-3 border-t border-[#2a3042] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FiDollarSign className="text-[#2e7d32]" />
                        <span className="text-xs text-gray-300">Cashout:</span>
                        <span className="text-sm font-bold text-[#2e7d32]">
                          KSh {Number(bet.cashoutValue || 0).toLocaleString()}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-[#2e7d32] text-white rounded-lg text-xs font-bold">
                        Cashout
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}