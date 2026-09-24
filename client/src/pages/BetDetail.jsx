// src/pages/BetDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/axios';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiXCircle, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';

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

  const statusColor = {
    WON: 'bg-green-500 text-white',
    LOST: 'bg-red-500 text-white',
    PENDING: 'bg-yellow-500 text-black',
    CANCELLED: 'bg-gray-500 text-white',
    CASHED_OUT: 'bg-blue-500 text-white',
  }[bet.status] || 'bg-gray-500 text-white';

  const selections = bet.selections || [];
  const hasLiveSelection = selections.some(s =>
    ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'].includes(s.match?.status)
  );
  const hasFinishedSelection = selections.some(s => s.match?.status === 'FINISHED');

  return (
    <div className="min-h-screen bg-[#0f1117] py-4">
      <div className="container mx-auto px-3 max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-[#1a1f2e] border border-[#2a3042] text-gray-400 hover:text-white"
          >
            <FiArrowLeft size={18} />
          </button>
          <span className="text-xs text-gray-500 font-mono">
            Ref: {bet.reference || String(bet._id).slice(-10)}
          </span>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-bold px-3 py-1 rounded ${statusColor}`}>
            {bet.status}
          </span>
          <span className="text-xs text-gray-500">
            {bet.type || 'SINGLE'} • {bet.createdAt ? format(new Date(bet.createdAt), 'dd MMM, HH:mm') : ''}
          </span>
        </div>

        {/* Stake / Odds / To Win */}
        <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#2a3042] mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Stake</p>
              <p className="text-lg font-bold text-white mt-1">
                {Number(bet.stake || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-500">KES</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Odds</p>
              <p className="text-lg font-bold text-white mt-1">
                {Number(bet.totalOdds || 1).toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-500">
                {selections.length} pick{selections.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">To Win</p>
              <p className="text-lg font-bold text-[#2e7d32] mt-1">
                {Number(bet.potentialWin || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-500">KES</p>
            </div>
          </div>
        </div>

        {/* Selections */}
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 ml-1">Selections</p>
        <div className="space-y-2 mb-6">
          {selections.map((s, i) => {
            const m = s.match || {};
            const live = ['LIVE', 'FIRST_HALF', 'SECOND_HALF', 'HALFTIME'].includes(m.status);
            const finished = m.status === 'FINISHED';
            return (
              <div key={i} className="bg-[#1a1f2e] rounded-xl p-4 border border-[#2a3042]">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {m.homeTeam?.name || 'TBD'} vs {m.awayTeam?.name || 'TBD'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      {m.league || ''}
                      {m.startsAt ? ` • ${format(new Date(m.startsAt), 'dd/MM HH:mm')}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs bg-[#2a2f3f] text-gray-300 px-2 py-0.5 rounded">
                    {s.marketName || 'Match Winner'}
                  </span>
                  <span className="text-sm font-bold text-[#2e7d32]">
                    @{Number(s.odds || 0).toFixed(2)}
                  </span>
                </div>

                {finished && (
                  <p className="text-[10px] text-gray-500 mt-2">
                    Final: {m.score?.home ?? 0} - {m.score?.away ?? 0}
                  </p>
                )}
                {live && (
                  <p className="text-[10px] text-red-400 mt-2">
                    <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                    Live • {m.minute ?? 0}' • {m.score?.home ?? 0} - {m.score?.away ?? 0}
                  </p>
                )}
              </div>
            );
          })}
        </div>

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
                {actionLoading
                  ? 'Processing...'
                  : `Cancel Bet — Refund KSh ${Number(bet.stake).toLocaleString()}`}
              </button>
            )}

            {canCashout && cashoutValue > 0 && (
              <button
                onClick={handleCashout}
                disabled={actionLoading}
                className="w-full py-3 bg-[#2e7d32] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1e5a22] disabled:opacity-50 transition-colors"
              >
                <FiDollarSign />
                {actionLoading
                  ? 'Processing...'
                  : `Cashout KSh ${cashoutValue.toLocaleString()}`}
              </button>
            )}

            {!canCancel && !canCashout && (
              <div className="p-3 bg-[#1a1f2e] rounded-xl border border-[#2a3042] text-center">
                <p className="text-xs text-gray-500">
                  {hasFinishedSelection
                    ? 'Match finished — waiting for settlement'
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