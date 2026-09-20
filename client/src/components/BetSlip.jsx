// src/components/BetSlip.jsx
import { useState, useEffect } from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { placeBet } from '../services/api';
import { FiTrash2, FiShoppingCart, FiCpu, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/axios';

const MINIMUM_STAKE = 500; // KES minimum stake

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
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const totalOdds = getTotalOdds();

  // Fetch AI recommendation when selections change
  useEffect(() => {
    if (selections.length > 0 && isAuthenticated) {
      fetchAIRecommendation();
    } else if (selections.length > 0 && !isAuthenticated) {
      // Show public recommendation without personalization
      const winProbability = (1 / totalOdds) * 100;
      setAiRecommendation({
        probability: winProbability.toFixed(1),
        confidence: winProbability > 20 ? 'High' : winProbability > 10 ? 'Medium' : 'Low',
        message: winProbability > 20 
          ? "🎯 Good value! Sign in for personalized insights based on your betting history." 
          : winProbability > 10 
          ? "📊 Moderate risk. Sign in to see how this compares to your past wins."
          : "⚠️ High risk accumulator. Sign in for personalized stake recommendations.",
        riskLevel: winProbability > 20 ? 'Low' : winProbability > 10 ? 'Medium' : 'High',
        requiresAuth: true
      });
    } else {
      setAiRecommendation(null);
    }
  }, [selections, isAuthenticated, totalOdds]);

  const fetchAIRecommendation = async () => {
    if (selections.length === 0) return;
    
    setLoadingAI(true);
    try {
      const response = await api.post('/ai/bet-slip-recommendation', {
        selections: selections.map(s => ({
          odds: s.selectedMarket.odds,
          market: s.selectedMarket.name,
          match: `${s.homeTeam?.name} vs ${s.awayTeam?.name}`
        })),
        totalOdds: totalOdds,
        totalStake: totalStake
      });
      setAiRecommendation(response.data.data);
    } catch (error) {
      console.error('Error fetching AI recommendation:', error);
      // Fallback to local calculation
      const winProbability = (1 / totalOdds) * 100;
      setAiRecommendation({
        probability: winProbability.toFixed(1),
        confidence: winProbability > 20 ? 'High' : winProbability > 10 ? 'Medium' : 'Low',
        message: winProbability > 20 
          ? "🎯 Good value! This accumulator has a high probability of winning." 
          : winProbability > 10 
          ? "📊 Moderate risk. Consider hedging with smaller stake."
          : "⚠️ High risk accumulator. Consider reducing selections.",
        riskLevel: winProbability > 20 ? 'Low' : winProbability > 10 ? 'Medium' : 'High',
        userInsight: null
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch(riskLevel) {
      case 'Low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'High': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch(riskLevel) {
      case 'Low': return '🎯';
      case 'Medium': return '📊';
      case 'High': return '⚠️';
      default: return '🤖';
    }
  };

  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check minimum stake
    if (totalStake < MINIMUM_STAKE) {
      toast.error(`Minimum stake is KSh ${MINIMUM_STAKE}`);
      return;
    }

    // Check sufficient balance
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
    <div className="bg-[#1a1f2e] rounded-xl border-2 border-[#2a3042] p-4 flex flex-col h-full">
      {/* Header with tabs */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center">
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
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'ordinary'
                ? 'bg-[#2e7d32] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ordinary
          </button>
          <button
            onClick={() => setActiveTab('express')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'express'
                ? 'bg-[#2e7d32] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Express
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
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
          {/* AI Recommendation Card */}
          {loadingAI ? (
            <div className="mb-4 p-3 rounded-lg border border-[#2a3042] bg-[#0f1219] animate-pulse">
              <div className="flex items-center space-x-2">
                <FiCpu className="text-gray-500" size={16} />
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          ) : aiRecommendation && (
            <div className={`mb-4 p-3 rounded-lg border ${getRiskColor(aiRecommendation.riskLevel)}`}>
              <div className="flex items-start space-x-2">
                <FiCpu className="mt-0.5 flex-shrink-0" size={16} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold">
                        AI Analysis • {aiRecommendation.confidence} Confidence
                      </span>
                      <span className="text-lg">{getRiskIcon(aiRecommendation.riskLevel)}</span>
                    </div>
                    {aiRecommendation.requiresAuth && !isAuthenticated && (
                      <button
                        onClick={() => navigate('/login')}
                        className="text-xs flex items-center space-x-1 text-[#2e7d32] hover:underline"
                      >
                        <FiLock size={10} />
                        <span>Sign in for personalized insights</span>
                      </button>
                    )}
                  </div>
                  <div className="text-xs mb-1">
                    {aiRecommendation.message}
                  </div>
                  {aiRecommendation.userInsight && isAuthenticated && (
                    <div className="text-xs mt-2 pt-2 border-t border-current border-opacity-20">
                      <span className="opacity-75">📊 {aiRecommendation.userInsight}</span>
                    </div>
                  )}
                  {aiRecommendation.suggestedStake && isAuthenticated && (
                    <div className="text-xs mt-1 opacity-75">
                      💡 Suggested stake: KSh {aiRecommendation.suggestedStake.toLocaleString()}
                    </div>
                  )}
                  <div className="text-[10px] mt-1 opacity-50">
                    Win probability: {aiRecommendation.probability}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selections List */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1 space-y-3">
            {selections.map((selection) => (
              <div
                key={`${selection._id}-${selection.selectedMarket.index}`}
                className="bg-[#0f1219] rounded-lg p-3 border border-[#2a3042]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm text-white font-medium">
                      {selection.homeTeam?.name} vs {selection.awayTeam?.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {selection.league}
                    </div>
                    {/* Show match status */}
                    {selection.status === 'FINISHED' && (
                      <div className="text-xs text-red-400 mt-1">
                        ⚠️ Match finished - Bet may be void
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromBetSlip(selection._id, selection.selectedMarket.index)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
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

            {/* Minimum stake warning */}
            {totalStake > 0 && totalStake < MINIMUM_STAKE && (
              <div className="text-yellow-500 text-xs text-center">
                Minimum stake is KSh {MINIMUM_STAKE}
              </div>
            )}

            {/* Balance warning */}
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