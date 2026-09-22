import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyBets, getTransactions } from '../services/api';
import { format } from 'date-fns';
import api from '../services/axios';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [bets, setBets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [balances, setBalances] = useState({ KES: 0, UGX: 0, MWK: 0 });

  useEffect(() => {
    loadData();
    fetchBalance();
    
    const handleBalanceUpdate = (event) => {
      if (event.detail && event.detail.newBalance !== undefined) {
        setBalance(event.detail.newBalance);
        updateBalances(event.detail.newBalance);
        if (setUser) {
          setUser({ ...user, balance: event.detail.newBalance });
        }
      }
    };
    
    window.addEventListener('balance-update', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balance-update', handleBalanceUpdate);
    };
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await api.get('/payments/balance');
      if (response.data.success) {
        const data = response.data.data;
        setBalance(data.balance);
        updateBalances(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const updateBalances = (balanceKES) => {
    setBalances({
      KES: balanceKES,
      UGX: balanceKES * 28.5,
      MWK: balanceKES * 12.8
    });
  };

  const loadData = async () => {
    try {
      const [betsData, transactionsData] = await Promise.all([
        getMyBets(),
        getTransactions()
      ]);
      setBets(Array.isArray(betsData) ? betsData : betsData?.data || []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : transactionsData?.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalBets: bets.length,
    wonBets: bets.filter(b => b.status === 'WON').length,
    totalStaked: bets.reduce((acc, b) => acc + (b.stake || 0), 0),
    totalWon: bets.filter(b => b.status === 'WON').reduce((acc, b) => acc + (b.potentialWin || 0), 0)
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
      
      {/* Balance Cards - Shows all currencies */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">🇰🇪 Kenyan Shilling (KES)</p>
          <p className="text-xl sm:text-2xl font-bold text-[#00cc88] truncate">KSh {balances.KES.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">🇺🇬 Ugandan Shilling (UGX)</p>
          <p className="text-xl sm:text-2xl font-bold text-white truncate">USh {balances.UGX.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">🇲🇼 Malawian Kwacha (MWK)</p>
          <p className="text-xl sm:text-2xl font-bold text-white truncate">MK {balances.MWK.toLocaleString()}</p>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">Total Bets</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalBets}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">Won Bets</p>
          <p className="text-xl sm:text-2xl font-bold text-green-400">{stats.wonBets}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">Total Staked</p>
          <p className="text-xl sm:text-2xl font-bold text-white truncate">KSh {stats.totalStaked.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1f2e] p-3 sm:p-4 rounded-lg border border-[#2a3042]">
          <p className="text-gray-400 text-xs sm:text-sm">Win Rate</p>
          <p className="text-xl sm:text-2xl font-bold text-white">
            {stats.totalBets ? ((stats.wonBets / stats.totalBets) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Link to="/deposit" className="bg-gradient-to-r from-[#2e7d32] to-[#1e5a22] p-3 sm:p-4 rounded-lg text-center hover:from-[#1e5a22] hover:to-[#0e3a1a] transition-all">
          <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💰</div>
          <div className="font-bold text-white text-sm sm:text-base">Deposit</div>
          <div className="text-[10px] sm:text-xs text-gray-300">Min KSh 500</div>
        </Link>
        <Link to="/withdraw" className="bg-[#2a2f3f] p-3 sm:p-4 rounded-lg text-center hover:bg-[#353b4d] transition-all">
          <div className="text-xl sm:text-2xl mb-1 sm:mb-2">💸</div>
          <div className="font-bold text-white text-sm sm:text-base">Withdraw</div>
          <div className="text-[10px] sm:text-xs text-gray-400">Min KSh 500</div>
        </Link>
        <Link to="/bet-history" className="bg-[#2a2f3f] p-3 sm:p-4 rounded-lg text-center hover:bg-[#353b4d] transition-all">
          <div className="text-xl sm:text-2xl mb-1 sm:mb-2">📊</div>
          <div className="font-bold text-white text-sm sm:text-base">History</div>
          <div className="text-[10px] sm:text-xs text-gray-400">View all bets</div>
        </Link>
        <Link to="/" className="bg-[#2a2f3f] p-3 sm:p-4 rounded-lg text-center hover:bg-[#353b4d] transition-all">
          <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚽</div>
          <div className="font-bold text-white text-sm sm:text-base">Bet Now</div>
          <div className="text-[10px] sm:text-xs text-gray-400">Place your bets</div>
        </Link>
      </div>

      {/* Recent Bets */}
      <div className="bg-[#1a1f2e] rounded-lg p-4 sm:p-6 border border-[#2a3042]">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Recent Bets</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : bets.length === 0 ? (
          <p className="text-gray-400 text-sm">No bets yet. <Link to="/" className="text-[#2e7d32]">Start betting!</Link></p>
        ) : (
          <div className="space-y-3">
            {bets.slice(0, 5).map((bet) => (
              <div key={bet._id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-800 pb-3 sm:pb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm sm:text-base truncate">{bet.match?.homeTeam?.name} vs {bet.match?.awayTeam?.name}</p>
                  <p className="text-xs sm:text-sm text-gray-400">Stake: KSh {bet.stake?.toLocaleString()} @ {bet.odds}</p>
                </div>
                <span className={`self-start sm:self-auto px-2 py-1 rounded text-xs flex-shrink-0 ${
                  bet.status === 'WON' ? 'bg-green-500/20 text-green-400' :
                  bet.status === 'LOST' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {bet.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}