// src/pages/BetHistory.jsx
import { useState, useEffect } from 'react';
import { getMyBets } from '../services/api';
import { format } from 'date-fns';

// Decide the outcome shown in the Status column
function getOutcome(bet) {
  const selections = bet.selections || [];
  const won = selections.filter(s => s.status === 'WON').length;
  const lost = selections.filter(s => s.status === 'LOST').length;
  const pending = selections.filter(s => s.status === 'PENDING').length;
  const total = selections.length || 1;

  if (bet.status === 'WON')     return { label: 'WON',            cls: 'bg-green-500/20 text-green-400',   amount: Number(bet.winnings ?? bet.potentialWin ?? 0), amountLabel: 'Payout' };
  if (bet.status === 'LOST')    return { label: 'LOST',           cls: 'bg-red-500/20 text-red-400',       amount: Number(bet.stake || 0),                        amountLabel: 'Lost' };
  if (bet.status === 'VOID' || bet.status === 'REFUNDED')
                                return { label: 'VOID',           cls: 'bg-gray-500/20 text-gray-300',      amount: Number(bet.stake || 0),                        amountLabel: 'Refund' };
  if (bet.status === 'CASHED_OUT')
                                return { label: 'CASHED OUT',     cls: 'bg-blue-500/20 text-blue-400',      amount: Number(bet.cashoutAmount || bet.stake || 0),   amountLabel: 'Cashout' };

  // bet.status === 'PENDING' — read live state from selections
  if (lost > 0)                 return { label: 'LOST',           cls: 'bg-red-500/20 text-red-400',       amount: Number(bet.stake || 0),                        amountLabel: 'Lost',     sub: `${won}W · ${lost}L` };
  if (pending === 0 && won === total)
                                return { label: 'WON',            cls: 'bg-green-500/20 text-green-400',   amount: Number(bet.winnings ?? bet.potentialWin ?? 0), amountLabel: 'Payout',   sub: 'Awaiting payout' };
  return                               { label: 'Awaiting result',cls: 'bg-yellow-500/20 text-yellow-400', amount: Number(bet.potentialWin || 0),                 amountLabel: 'To win',   sub: `${won}W · ${pending} awaiting` };
}

export default function BetHistory() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadBets();
  }, []);

  const loadBets = async () => {
    try {
      const data = await getMyBets();
      setBets(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error('Error loading bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBets = bets.filter(bet => {
    if (filter === 'ALL') return true;
    if (filter === 'AWAITING') return bet.status === 'PENDING';
    return bet.status === filter;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Bet History</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'AWAITING', label: 'Awaiting' },
          { key: 'WON', label: 'Won' },
          { key: 'LOST', label: 'Lost' },
          { key: 'CASHED_OUT', label: 'Cashed Out' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-[#2e7d32] text-white'
                : 'bg-[#1a1f2e] text-gray-400 hover:bg-[#2a2f3f]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bets Table */}
      <div className="bg-[#1a1f2e] rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading bet history...</p>
          </div>
        ) : filteredBets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No bets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2a2f3f]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Match</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Market</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Odds</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Stake</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Outcome Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredBets.map((bet) => {
                  const outcome = getOutcome(bet);
                  const firstSel = bet.selections?.[0];
                  const firstMatch = firstSel?.match || bet.match || {};
                  const home = firstMatch.homeTeam?.abbreviation || firstMatch.homeTeam?.name || 'Home';
                  const away = firstMatch.awayTeam?.abbreviation || firstMatch.awayTeam?.name || 'Away';
                  const marketName = firstSel?.marketName
                    || (firstSel?.marketIndex != null && firstMatch.markets?.[firstSel.marketIndex]?.name)
                    || 'Selection';
                  const isMulti = (bet.selections?.length || 0) > 1;

                  return (
                    <tr key={bet._id} className="hover:bg-[#2a2f3f] transition-colors">
                      <td className="px-4 py-4 text-sm text-white whitespace-nowrap">
                        {isMulti ? `${bet.selections.length} selections` : `${home} vs ${away}`}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {isMulti ? 'Multi' : marketName}
                      </td>
                      <td className="px-4 py-4 text-sm text-[#00b3b3] font-bold text-right whitespace-nowrap">
                        @{Number(bet.totalOdds || 1).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-white text-right whitespace-nowrap">
                        KSh {Number(bet.stake || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-right whitespace-nowrap">
                        <div className="font-bold text-white">
                          KSh {outcome.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase">
                          {outcome.amountLabel}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${outcome.cls}`}>
                          {outcome.label}
                        </span>
                        {outcome.sub && (
                          <div className="text-[10px] text-gray-500 mt-1">{outcome.sub}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400 whitespace-nowrap">
                        {bet.createdAt ? format(new Date(bet.createdAt), 'dd/MM/yyyy HH:mm') : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}