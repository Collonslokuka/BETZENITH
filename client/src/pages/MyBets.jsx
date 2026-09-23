import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyBets } from '../services/api';
import { format } from 'date-fns';
import { FiTrendingUp, FiClock, FiCheckCircle, FiXCircle, FiDollarSign, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
    profit: 0
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
        .reduce((sum, b) => sum + (b.potentialWin || 0), 0);

      setStats({
        totalBets,
        wonBets,
        lostBets,
        pendingBets,
        totalStake,
        totalWinnings,
        profit: totalWinnings - totalStake
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
    return bet.status === filter;
  });

  const statusDot = (status) => {
    switch (status) {
      case 'WON': return 'bg-green-500';
      case 'LOST': return 'bg-red-500';
      case 'PENDING': return 'bg-yellow-400';
      case 'CASHED_OUT': return 'bg-blue-500';
      case 'VOID': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'WON': return <FiCheckCircle className="text-green-400" />;
      case 'LOST': return <FiXCircle className="text-red-400" />;
      case 'PENDING': return <FiClock className="text-yellow-400" />;
      default: return <FiTrendingUp className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'WON': 'bg-green-500/20 text-green-400',
      'LOST': 'bg-red-500/20 text-red-400',
      'PENDING': 'bg-yellow-500/20 text-yellow-400',
      'CASHED_OUT': 'bg-blue-500/20 text-blue-400',
      'VOID': 'bg-gray-500/20 text-gray-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

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
              <h1 className="text-lg sm:text-xl font-bold text-white">Bet History</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3042]">
            <p className="text-gray-400 text-xs">Profit/Loss</p>
            <p className={`text-lg sm:text-2xl font-bold truncate ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              KSh {stats.profit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'All', dot: null },
            { key: 'PENDING', label: 'Pending', dot: 'bg-yellow-400' },
            { key: 'WON', label: 'Won', dot: 'bg-green-500' },
            { key: 'LOST', label: 'Lost', dot: 'bg-red-500' },
            { key: 'CASHED_OUT', label: 'Cancelled', dot: 'bg-gray-400' }
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
              const betId = bet._id;
              const code = (bet.reference || String(betId).slice(-10));
              const date = bet.createdAt
                ? format(new Date(bet.createdAt), 'MMM d')
                : '';

              // Support both formats: single match bet OR multi-selection bet
              const selections = bet.selections || [];
              const isMulti = selections.length > 1;
              const firstMatch = selections[0]?.match || bet.match || {};
              const home = firstMatch.homeTeam?.name || 'Home';
              const away = firstMatch.awayTeam?.name || 'Away';
              const matchLabel = isMulti
                ? `${selections.length} selections`
                : `${home} vs ${away}`;

              return (
                <Link
                  key={betId}
                  to={`/bet/${betId}`}
                  className="block bg-[#1a1f2e] rounded-xl p-4 border border-[#2a3042] hover:border-[#2e7d32]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(bet.status)}`} />
                      <span className="text-xs text-gray-500 font-mono truncate">{code}</span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{date}</span>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm sm:text-base font-semibold text-white truncate">
                      {matchLabel}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isMulti ? 'Multi' : 'Single'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      Stake: <span className="font-bold text-white">KSh {Number(bet.stake || 0).toLocaleString()}</span>
                    </span>
                    <span className="text-gray-500 text-lg">›</span>
                  </div>

                  {/* Cashout row if available */}
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