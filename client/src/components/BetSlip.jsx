// src/components/BetSlip.jsx
import { useState } from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { placeBet } from '../services/api';
import { FiTrash2, FiShoppingCart } from 'react-icons/fi';
import toast from 'react-hot-toast';

const MINIMUM_STAKE = 500;

export default function BetSlip() {
  const {
    selections,
    totalStake,
    potentialWin,
    removeFromBetSlip,
    updateStake,
    clearBetSlip,
    getTotalOdds
  } = useBetSlip();

  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [activeTab, setActiveTab] = useState('ordinary');

  const totalOdds = getTotalOdds();

  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (totalStake < MINIMUM_STAKE) {
      toast.error(`Minimum stake is KSh ${MINIMUM_STAKE}`);
      return;
    }

    if (totalStake > (user?.balance || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setPlacing(true);

    try {
      const betPromises = selections.map(selection =>
        placeBet({
          matchId: selection._id,
          marketIndex: selection.selectedMarket.index,
          stake: selection.stake,
          odds: selection.selectedMarket.odds,
          selection: selection.selectedMarket.name,
          currency: 'KES'
        })
      );

      await Promise.all(betPromises);
      clearBetSlip();
      toast.success('Bets placed successfully!');
      navigate('/my-bets');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error placing bets');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="bg-[#1a1f2e] rounded-xl border-2 border-[#2a3042] p-3 sm:p-4 flex flex-col h-full">
      {/* Header with tabs */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center">
            <FiShoppingCart className="mr-2 text-[#2e7d32]" />
            Bet Slip
          </h2>
          {selections.length > 0 && (
            <span className="text-xs bg-[#2e7d32]/10 text-[#2e7d32] px-2 py-1 rounded-full">
              {selections.length} selection{selections.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-[#0f1219] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('ordinary')}
            className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'ordinary'
                ? 'bg-[#2e7d32] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ordinary
          </button>
          <button
            onClick={() => setActiveTab('express')}
            className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'express'
                ? 'bg-[#2e7d32] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Express
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'system'
                ? 'bg-[#2e7d32] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            System
          </button>
        </div>
      </div>

      {selections.length === 0 ? (
        <div className="text-center py-8 flex-1 flex items-center justify-center">
          <div>
            <div className="text-4xl text-gray-600 mb-2">📋</div>
            <p className="text-gray-400 text-sm">Your bet slip is empty</p>
            <p className="text-xs text-gray-500 mt-1">Click on odds to add selections</p>
          </div>
        </div>
      ) : (
        <>
          {/* Selections List */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1 space-y-3">
            {selections.map((selection) => (
              <div
                key={`${selection._id}-${selection.selectedMarket.index}`}
                className="bg-[#0f1219] rounded-lg p-3 border border-[#2a3042]"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white font-medium truncate">
                      {selection.homeTeam?.name} vs {selection.awayTeam?.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {selection.league}
                    </div>
                    {selection.status === 'FINISHED' && (
                      <div className="text-xs text-red-400 mt-1">
                        ⚠️ Match finished - Bet may be void
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromBetSlip(selection._id, selection.selectedMarket.index)}
                    className="text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
                <div className="mb-2">
                  <span className="text-xs bg-[#2a2f3f] text-gray-300 px-2 py-0.5 rounded">
                    {selection.selectedMarket.name}
                  </span>
                  <span className="ml-2 text-[#2e7d32] text-sm font-bold">
                    @{selection.selectedMarket?.odds?.toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder={`Min KSh ${MINIMUM_STAKE}`}
                  value={selection.stake || ''}
                  onChange={(e) => updateStake(
                    selection._id,
                    selection.selectedMarket.index,
                    e.target.value
                  )}
                  className="w-full px-3 py-1.5 bg-[#2a2f3f] rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
                  min={MINIMUM_STAKE}
                  step={100}
                />
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-3 mb-3">
            <div className="bg-[#0f1117] p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Total Odds</span>
                <span className="text-[#2e7d32] font-bold text-lg">
                  {totalOdds.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="bg-[#0f1117] p-3 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Total Stake:</span>
                <span className="text-white font-medium">
                  KSh {totalStake.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Potential Win:</span>
                <span className="text-[#2e7d32] font-bold">
                  KSh {potentialWin.toFixed(2)}
                </span>
              </div>
            </div>

            {totalStake > 0 && totalStake < MINIMUM_STAKE && (
              <div className="text-yellow-500 text-xs text-center">
                Minimum stake is KSh {MINIMUM_STAKE}
              </div>
            )}

            {totalStake > (user?.balance || 0) && (
              <div className="text-red-500 text-xs text-center">
                Insufficient balance
              </div>
            )}
          </div>

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={placing || totalStake < MINIMUM_STAKE || totalStake > (user?.balance || 0)}
            className="w-full py-2.5 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {placing ? 'Placing Bet...' : `Place Bet (Min KSh ${MINIMUM_STAKE})`}
          </button>
        </>
      )}
    </div>
  );
}