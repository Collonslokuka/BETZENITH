// src/components/MatchCard.jsx
import { useState } from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ============================================================
//  BETTING CLOSURE HELPERS
// ============================================================
const BETTING_CLOSE_MINUTES = {
  soccer: 85,
  basketball: 45,
  football: 55,
  baseball: 8,
  hockey: 55,
  tennis: 4,
  mma: 4,
  boxing: 11,
  golf: 3,
  cricket: 18,
  rugby: 75,
  f1: 50,
  esports: 4,
};

const CLOSED_STATUSES = ['FINISHED', 'CANCELLED', 'POSTPONED', 'ABANDONED', 'SUSPENDED'];

const isBettingClosed = (match) => {
  if (!match) return true;
  if (CLOSED_STATUSES.includes(match.status)) return true;

  const sport = (match.sport || 'soccer').toLowerCase();
  const cutoff = BETTING_CLOSE_MINUTES[sport] ?? 85;
  const minute = match.minute || 0;

  if (
    ['SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(match.status) &&
    minute >= cutoff
  ) {
    return true;
  }

  const maxDuration = match.matchDuration || 90;
  if (
    ['LIVE', 'SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(match.status) &&
    minute >= maxDuration
  ) {
    return true;
  }

  return false;
};

const getBettingClosedReason = (match) => {
  if (!match) return 'Betting closed';
  if (match.status === 'FINISHED') return 'Match finished';
  if (match.status === 'CANCELLED') return 'Match cancelled';
  if (match.status === 'POSTPONED') return 'Match postponed';

  const sport = (match.sport || 'soccer').toLowerCase();
  const cutoff = BETTING_CLOSE_MINUTES[sport] ?? 85;

  if (
    ['SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(match.status) &&
    (match.minute || 0) >= cutoff
  ) {
    return `Betting closed — final stages (${match.minute}')`;
  }

  return 'Betting closed';
};

// ============================================================
//  AI PREDICTION BADGE
// ============================================================
const AIPredictionBadge = ({ prediction, homeTeam, awayTeam }) => {
  if (!prediction) return null;

  const getPredictionColor = (winner) => {
    if (winner === 'HOME') return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (winner === 'AWAY') return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  };

  const getPredictionText = (winner) => {
    if (winner === 'HOME') return `${homeTeam.name} to win`;
    if (winner === 'AWAY') return `${awayTeam.name} to win`;
    return 'Draw';
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel === 'Low') return 'text-green-400';
    if (riskLevel === 'Medium') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="mt-3 p-2.5 rounded-lg bg-[#0f1219] border border-[#2a3042]">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm">🤖</span>
          <span className="text-xs text-gray-400">AI Prediction:</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPredictionColor(
              prediction.predictedWinner
            )}`}
          >
            {getPredictionText(prediction.predictedWinner)}
          </span>
          <span className="text-xs text-gray-500">
            ({prediction.confidence}% confidence)
          </span>
        </div>
        {prediction.riskLevel && (
          <span className={`text-xs font-medium ${getRiskColor(prediction.riskLevel)}`}>
            {prediction.riskLevel} Risk
          </span>
        )}
      </div>
      {prediction.insight && (
        <p className="text-xs text-gray-500 mt-2">{prediction.insight}</p>
      )}
      {prediction.probability && (
        <div className="mt-2 flex items-center justify-between text-xs flex-wrap gap-1">
          <span className="text-gray-500">Win Probability:</span>
          <div className="flex space-x-3">
            <span className="text-green-400">H: {prediction.probability.home}%</span>
            <span className="text-yellow-400">D: {prediction.probability.draw}%</span>
            <span className="text-orange-400">A: {prediction.probability.away}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
//  MATCH STATUS
// ============================================================
const MatchStatus = ({ match }) => {
  if (
    match.status === 'LIVE' ||
    match.status === 'FIRST_HALF' ||
    match.status === 'SECOND_HALF'
  ) {
    return (
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        <span className="text-red-500 text-xs font-bold">LIVE</span>
        <span className="text-white text-sm">{match.minute}'</span>
      </div>
    );
  }

  if (match.status === 'FINISHED') {
    return (
      <div className="text-gray-500 text-xs">
        FT • {match.score?.home || 0} - {match.score?.away || 0}
      </div>
    );
  }

  if (match.status === 'HALFTIME') {
    return (
      <div className="text-yellow-500 text-xs font-medium">
        HT • {match.score?.home || 0} - {match.score?.away || 0}
      </div>
    );
  }

  return (
    <div className="text-gray-500 text-xs">
      {match.startsAt
        ? new Date(match.startsAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '19:00'}
    </div>
  );
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
export default function MatchCard({ match }) {
  const [selectedMarket, setSelectedMarket] = useState(null);
  const { addToBetSlip } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const matchId = match._id || match.id;

  const homeTeam = {
    name: match.homeTeam?.name || 'Home',
    abbreviation:
      match.homeTeam?.abbreviation ||
      match.homeTeam?.name?.substring(0, 3).toUpperCase() ||
      'HOM',
    logo: match.homeTeam?.logo,
  };

  const awayTeam = {
    name: match.awayTeam?.name || 'Away',
    abbreviation:
      match.awayTeam?.abbreviation ||
      match.awayTeam?.name?.substring(0, 3).toUpperCase() ||
      'AWY',
    logo: match.awayTeam?.logo,
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '19:00';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarketClick = (market, category, index) => {
    if (match.status === 'FINISHED' || market.isActive === false) {
      toast.error('Market closed');
      return;
    }

    if (isBettingClosed(match)) {
      toast.error(getBettingClosedReason(match));
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    addToBetSlip({
      ...match,
      selectedMarket: { ...market, index },
    });
    setSelectedMarket(`${category}-${index}`);
  };

  const getOdds = () => {
    if (match.markets && match.markets.length > 0) {
      return match.markets;
    }
    return [
      { name: '1', odds: 2.1, isActive: true },
      { name: 'X', odds: 3.4, isActive: true },
      { name: '2', odds: 3.2, isActive: true },
    ];
  };

  const markets = getOdds();
  const bettingClosed = isBettingClosed(match);
  const closedReason = bettingClosed ? getBettingClosedReason(match) : null;

  return (
    <div className="bg-[#1a1f2e] rounded-lg p-3 sm:p-5 border border-gray-800 hover:border-[#2e7d32]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#2e7d32]/5">
      {/* League Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mb-3 sm:mb-4">
        <span className="text-xs sm:text-sm text-gray-400 truncate">{match.league || 'Unknown League'}</span>
        <div className="text-left sm:text-right flex sm:block items-center gap-2">
          <span className="text-white text-xs sm:text-sm">
            {formatTime(match.startsAt || match.date)}
          </span>
          <span className="text-gray-500 text-xs sm:ml-2">
            {formatDate(match.startsAt || match.date)}
          </span>
        </div>
      </div>

      {/* Teams Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="text-lg sm:text-2xl font-bold text-white flex-shrink-0">{homeTeam.abbreviation}</span>
          <span className="text-white font-medium text-sm sm:text-base truncate">{homeTeam.name}</span>
        </div>
        <div className="flex items-center gap-2 sm:justify-end min-w-0">
          <MatchStatus match={match} />
          <span className="text-white font-medium text-sm sm:text-base truncate">{awayTeam.name}</span>
          <span className="text-lg sm:text-2xl font-bold text-white flex-shrink-0">{awayTeam.abbreviation}</span>
        </div>
      </div>

      {/* Score Display */}
      {match.score && match.status !== 'SCHEDULED' && (
        <div className="text-center mb-3 sm:mb-4">
          <span className="text-lg sm:text-xl font-bold text-[#2e7d32]">
            {typeof match.score === 'object'
              ? `${match.score.home || 0} - ${match.score.away || 0}`
              : match.score}
          </span>
        </div>
      )}

      {/* AI Prediction */}
      {(match.aiPrediction || match.prediction) && (
        <AIPredictionBadge
          prediction={match.aiPrediction || match.prediction}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      )}

      {/* Betting Closed Warning */}
      {bettingClosed && match.status !== 'FINISHED' && (
        <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-xs font-medium flex items-center gap-2">
            <span>🔒</span>
            <span>{closedReason}</span>
          </p>
        </div>
      )}

      {/* Match Winner Market */}
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm text-white font-medium">Match Winner</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {markets.slice(0, 3).map((market, idx) => {
            const isDisabled = match.status === 'FINISHED' || market.isActive === false || bettingClosed;
            return (
              <button
                key={idx}
                onClick={() => handleMarketClick(market, 'winner', idx)}
                disabled={isDisabled}
                className={`
                  bg-[#2a2f3f] p-2 sm:p-3 rounded text-center transition-all duration-200
                  ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[#353b4d] active:scale-95 cursor-pointer'
                  }
                  ${selectedMarket === `winner-${idx}` ? 'ring-2 ring-[#2e7d32]' : ''}
                `}
              >
                <div className="text-[10px] sm:text-xs text-gray-400 mb-1 truncate">{market.name}</div>
                <div className="text-sm sm:text-lg font-bold text-[#2e7d32]">
                  {market.odds?.toFixed(2) || market.price?.toFixed(2) || '2.00'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Markets */}
      {markets.length > 3 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-white font-medium">More Markets</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {markets.slice(3, 6).map((market, idx) => {
              const isDisabled =
                match.status === 'FINISHED' || market.isActive === false || bettingClosed;
              return (
                <button
                  key={idx}
                  onClick={() => handleMarketClick(market, 'more', idx + 3)}
                  disabled={isDisabled}
                  className={`
                    bg-[#2a2f3f] p-2 sm:p-3 rounded text-center transition-all duration-200
                    ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-[#353b4d] active:scale-95 cursor-pointer'
                    }
                    ${selectedMarket === `more-${idx + 3}` ? 'ring-2 ring-[#2e7d32]' : ''}
                  `}
                >
                  <div className="text-[10px] sm:text-xs text-gray-400 mb-1 truncate">{market.name}</div>
                  <div className="text-sm sm:text-lg font-bold text-[#2e7d32]">
                    {market.odds?.toFixed(2) || market.price?.toFixed(2) || '2.00'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}