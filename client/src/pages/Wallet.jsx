// src/pages/Wallet.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/axios';
import { useAuth } from '../context/AuthContext';

export default function Wallet() {
  const { user } = useAuth();
  const [balances, setBalances] = useState({ withdrawable: 0, deposit: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/payments/balance');
        const d = res.data?.data || {};
        // Split current balance between withdrawable (winnings) and deposit
        // Adjust this logic to match whatever your backend tracks
        setBalances({
          withdrawable: d.withdrawable ?? 0,
          deposit: d.balance ?? d.deposit ?? 0,
        });
      } catch {}

      try {
        const txRes = await api.get('/payments/transactions?type=WITHDRAWAL');
        const list = Array.isArray(txRes.data?.data) ? txRes.data.data : [];
        setHistory(list);
      } catch {}

      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c14] py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-3xl">

        {/* Wallet Balances */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 sm:p-5 border border-[#2a3042] mb-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <span>💼</span> Wallet Balances
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Withdrawable — green */}
            <div className="bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-xl p-4 text-white">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-90 font-semibold">Withdrawable</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 truncate">
                KSh {Number(balances.withdrawable).toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs opacity-80 mt-1">Winnings only</p>
            </div>

            {/* Deposit — blue */}
            <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-xl p-4 text-white">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-90 font-semibold">Deposit</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 truncate">
                KSh {Number(balances.deposit).toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs opacity-80 mt-1">For bets & taxes</p>
            </div>
          </div>

          {/* Withdraw button */}
          <Link
            to="/withdraw"
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors text-sm"
          >
            <span>↑</span> Withdraw Money
          </Link>

          {Number(balances.withdrawable) === 0 && (
            <p className="text-center text-[11px] text-gray-500 mt-3">
              No withdrawable balance. Win bets to earn withdrawable funds!
            </p>
          )}
        </div>

        {/* Withdrawal history */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 sm:p-5 border border-[#2a3042]">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <span>🕐</span> Withdrawal History
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No withdrawals yet</p>
          ) : (
            <div className="divide-y divide-[#2a3042]">
              {history.map((tx) => (
                <div key={tx._id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      KSh {Number(Math.abs(tx.amount || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    tx.status === 'COMPLETED'
                      ? 'bg-green-500/20 text-green-400'
                      : tx.status === 'FAILED'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {tx.status || 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}