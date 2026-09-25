// src/pages/BetDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/axios';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiXCircle, FiDollarSign, FiCopy, FiCalendar } from 'react-icons/fi';
import { format } from 'date-fns';

// Compute a clear outcome from the bet + its selections.
// Mirrors the logic used in MyBets and BetHistory.
function getOutcome(bet) {
  const selections = bet.selections || [];
  const won     = selections.filter(s => s.status === 'WON').length;
  const lost    = selections.filter(s => s.status === 'LOST').length;
  const pending = selections.filter(s => s.status === 'PENDING').length;
  const settled = won + lost;
  const total   = selections.length || 1;

  if (bet.status === 'WON') {
    return {
      key: 'WON', label: 'Won Bet', bg: 'bg-green-500', icon: '🏆',
      payout: Number(bet.winnings ?? bet.potentialWin ?? 0),
      payoutColor: 'text-green-400',
      sub: `${won} of ${total} won`,
    };
  }
  if (bet.status === 'LOST') {
    return {
      key: 'LOST', label: 'Lost Bet', bg: 'bg-red-500', icon: '❌',
      payout: 0,
      payoutColor: 'text-red-400',
      sub: `${lost} of ${total} lost`,
    };
  }
  if (bet.status === 'VOID' || bet.status === 'REFUNDED') {
    return {
      key: 'VOID', label: 'Void', bg: 'bg-gray-500', icon: '↩️',
      payout: Number(bet.winnings ?? bet.stake ?? 0),
      payoutColor: 'text-gray-300',
      sub: 'Stake refunded',
    };
  }
  if (bet.status === 'CANCELLED') {
    return {
      key: 'CANCELLED', label: 'Cancelled', bg: 'bg-gray-500', icon: '🚫',
      payout: Number(bet.stake ?? 0),
      payoutColor: 'text-gray-300',
      sub: 'Stake refunded',
    };
  }
  if (bet.status === 'CASHED_OUT') {
    return {
      key: 'CASHED_OUT', label: 'Cashed Out', bg: 'bg-blue-500', icon: '💰',
      payout: Number(bet.cashoutAmount ?? bet.winnings ?? bet.stake ?? 0),
      payoutColor: 'text-blue-400',
      sub: 'Cashed out early',
    };
  }

  // bet.status === 'PENDING' — read live state from selections
  if (lost > 0) {
    return {
      key: 'LOST_LIVE', label: 'Lost Bet', bg: 'bg-red-500', icon: '❌',
      payout: 0,
      payoutColor: 'text-red-400',
      sub: `${won}W · ${lost}L`,
    };
  }
  if (pending === 0 && won === total) {
    return {
      key: 'WON_LIVE', label: 'Won Bet', bg: 'bg-green-500', icon: '🏆',
      payout: Number(bet.winnings ?? bet.potentialWin ?? 0),
      payoutColor: 'text-green-400',
      sub: 'Awaiting payout',
    };
  }
  return {
    key: 'AWAITING', label: 'Awaiting Result', bg: 'bg-yellow-500', icon: '⏳',
    payout: Number(bet.potentialWin ?? 0),
    payoutColor: 'text-emerald-400',
    sub: settled > 0 ? `${won}W · ${pending} awaiting` : `${pending} selection${pending !== 1 ? 's' : ''}`,
  };
}

export default function BetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [canCashout, setCanCashout] = useState(false);
  const [cashoutValue, setCashoutValue] = useState(0);

  const load = async () => {
    try {
      const res = await api.get(`/bets/${id}`);
      const b = res.data.data;
      setBet(b);

      const selections = b.selections || [];
      const allNotStarted = selections.length > 0 && selections.every(s => {
        const m = s.match;
        if (!m) return false;
        if (m.status !== 'SCHEDULED') return false;
        if (new Date(m.startsAt) <= new Date()) return false;
        return true;
      });
      setCanCancel(b.status === 'PENDING' && allNotStarted);

      setCanCashout(!!b.cashoutAvailable && !b.cashoutTaken && b.status === 'PENDING');
      setCashoutValue(Number(b.cashoutValue) || 0);
    } catch (err) {
      toast.error('Failed to load bet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const copyId = () => {
    if (!bet) return;
    const text = bet.reference || String(bet._id).slice(-10);
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this bet and get your stake back?')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/bets/${id}/cancel`);
      toast.success(`Cancelled — KSh ${Number(res.data.data.refunded).toLocaleString()} refunded`);
      window.dispatchEvent(new CustomEvent('balance-update', {
        detail: { newBalance: res.data.data.newBalance }
      }));
      navigate('/my-bets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!confirm(`Cash out for KSh ${cashoutValue.toLocaleString()}?`)) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/bets/${id}/cashout`);
      toast.success(`Cashed out — KSh ${Number(res.data.data.cashoutValue).toLocaleString()}`);
      window.dispatchEvent(new CustomEvent('balance-update', {
        detail: { newBalance: res.data.data.newBalance }
      }));
      navigate('/my-bets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cashout failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center text-gray-400">
        <p>Bet not found</p>
        <button onClick={() => navigate('/my-bets')} className="mt-4 text-[#2e7d32]">Back to My Bets</button>
      </div>
    );
  }

  const outcome = getOutcome(bet);
  const statusMeta = { label: outcome.label, bg: outcome.bg, icon: outcome.icon };

  const selections = bet.selections || [];
  const settledDate = bet.settledAt || bet.processedAt || bet.updatedAt;
  const hasLiveSelection = selections.some(s =>
    ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'].includes(s.match?.status)
  );
  const hasFinishedSelection = selections.some(s => s.match?.status === 'FINISHED');

  return (
    <div className="min-h-screen bg-[#0f1117] pb-8">
      <div className="container mx-auto px-3 max-w-md pt-4">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/my-bets')}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <FiArrowLeft size={16} /> Back to History
          </button>
          <button
            onClick={copyId}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <FiCopy size={12} /> Copy ID
          </button>
        </div>

        {/* Status header */}
        <div className={`${statusMeta.bg} rounded-xl p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{statusMeta.icon}</span>
              <div>
                <p className="font-bold text-white text-base">{statusMeta.label}</p>
                <p className="text-[11px] text-white/80 mt-0.5">
                  {String(bet.type || 'SINGLE').toLowerCase()} • {selections.length} selection{selections.length !== 1 ? 's' : ''}
                  {outcome.sub ? ` • ${outcome.sub}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/70 uppercase tracking-wider">Placed</p>
              <p className="text-[11px] text-white mt-0.5">
                {bet.createdAt ? format(new Date(bet.createdAt), 'MMM d, HH:mm') : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Bet ID */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#2a3042] mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Bet ID</p>
              <p className="text-sm text-white font-mono mt-0.5">
                {bet.reference || String(bet._id).slice(-10)}
              </p>
            </div>
            <button onClick={copyId} className="p-2 hover:bg-[#2a3042] rounded-lg transition-colors">
              <FiCopy size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stake / Potential / Payout */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#2a3042] mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Stake</p>
              <p className="text-base font-bold text-white mt-1">
                {Number(bet.stake || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-gray-500 mt-0.5">KES</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Potential</p>
              <p className="text-base font-bold text-[#2e7d32] mt-1">
                {Number(bet.potentialWin || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-gray-500 mt-0.5">KES</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Payout</p>
              <p className={`text-base font-bold mt-1 ${outcome.payoutColor}`}>
                {outcome.payout.toLocaleString()}
              </p>
              <p className="text-[9px] text-gray-500 mt-0.5">KES</p>
            </div>
          </div>
        </div>

        {/* Selections */}
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 ml-1">Selections</p>
        <div className="space-y-3 mb-4">
          {selections.map((s, i) => {
            const m = s.match || {};
            const live = ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'].includes(m.status);
            const finished = m.status === 'FINISHED';
            const selStatus = s.status;

            return (
              <div key={i} className="bg-[#1a1f2e] rounded-xl border border-[#2a3042] overflow-hidden">
                <div className="p-4 border-b border-[#2a3042]">
                  <p className="text-sm font-bold text-white">
                    {m.homeTeam?.name || 'TBD'} vs {m.awayTeam?.name || 'TBD'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{m.league || ''}</p>
                </div>

                <div className="p-4 bg-[#0f1219]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">Your Selection</p>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded mt-1.5 ${
                        selStatus === 'WON' ? 'bg-green-500 text-white'
                        : selStatus === 'LOST' ? 'bg-red-500 text-white'
                        : 'bg-[#2e7d32] text-white'
                      }`}>
                        {s.marketName || 'Match Winner'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">Odds</p>
                      <p className="text-lg font-bold text-[#2e7d32] mt-1">
                        @{Number(s.odds || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#2a3042] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px]">
                      {live && (
                        <>
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-red-400 font-medium">Live {m.minute ?? 0}'</span>
                        </>
                      )}
                      {finished && <span className="text-gray-400 font-medium">Finished</span>}
                      {!live && !finished && (
                        <span className="text-gray-400">
                          {m.startsAt ? `Starts ${format(new Date(m.startsAt), 'MMM d, HH:mm')}` : 'Scheduled'}
                        </span>
                      )}
                    </div>
                    {(live || finished) && (
                      <span className="text-base font-bold text-white">
                        {m.score?.home ?? 0} : {m.score?.away ?? 0}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Settled row */}
        {settledDate && ['WON', 'LOST', 'VOID', 'CANCELLED', 'CASHED_OUT'].includes(bet.status) && (
          <div className="bg-[#1a1f2e] rounded-xl p-3 border border-[#2a3042] mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FiCalendar size={14} />
              <span>Settled</span>
            </div>
            <span className="text-xs text-gray-400">
              {format(new Date(settledDate), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        )}

        {/* Actions */}
        {bet.status === 'PENDING' && (
          <div className="space-y-3">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="w-full py-3 bg-[#2a2f3f] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#353b4d] disabled:opacity-50 transition-colors"
              >
                <FiXCircle />
                {actionLoading ? 'Processing...' : `Cancel Bet — Refund KSh ${Number(bet.stake).toLocaleString()}`}
              </button>
            )}

            {canCashout && cashoutValue > 0 && (
              <button
                onClick={handleCashout}
                disabled={actionLoading}
                className="w-full py-3 bg-[#2e7d32] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1e5a22] disabled:opacity-50 transition-colors"
              >
                <FiDollarSign />
                {actionLoading ? 'Processing...' : `Cashout KSh ${cashoutValue.toLocaleString()}`}
              </button>
            )}

            {!canCancel && !canCashout && (
              <div className="p-3 bg-[#1a1f2e] rounded-xl border border-[#2a3042] text-center">
                <p className="text-xs text-gray-500">
                  {hasFinishedSelection
                    ? 'Match finished — settling your bet...'
                    : hasLiveSelection
                    ? 'Cashout currently unavailable for this bet'
                    : 'Cancel window closed — match has started'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}