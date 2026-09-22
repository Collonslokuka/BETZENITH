// src/pages/LiveMatches.jsx
import { useState, useEffect } from 'react';
import MatchCard from '../components/MatchCard';
import LiveBetting from '../components/LiveBetting';
import { useOddsData } from '../hooks/useOddsData';
import { FiFilter } from 'react-icons/fi';

export default function LiveMatches() {
  const [filteredSport, setFilteredSport] = useState('all');
  const { liveEvents, loading, error, refreshAll } = useOddsData('all');

  const filteredMatches = filteredSport === 'all' 
    ? liveEvents 
    : liveEvents.filter(m => m.sport === filteredSport);

  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const league = match.league || 'Other';
    if (!groups[league]) groups[league] = [];
    groups[league].push(match);
    return groups;
  }, {});

  if (loading && liveEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading live matches...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white">⚡ Live Matches</h1>
          
          {/* Sport filter */}
          <div className="flex items-center space-x-2">
            <FiFilter className="text-gray-400 flex-shrink-0" />
            <select 
              value={filteredSport}
              onChange={(e) => setFilteredSport(e.target.value)}
              className="bg-[#1a1f2e] text-white px-3 py-1.5 sm:py-1 rounded-lg border border-[#2a3042] text-sm flex-1"
            >
              <option value="all">All Sports</option>
              <option value="soccer">Soccer</option>
              <option value="basketball">Basketball</option>
              <option value="football">American Football</option>
              <option value="tennis">Tennis</option>
              <option value="baseball">Baseball</option>
              <option value="hockey">Hockey</option>
              <option value="mma">MMA</option>
              <option value="boxing">Boxing</option>
              <option value="golf">Golf</option>
              <option value="cricket">Cricket</option>
              <option value="rugby">Rugby</option>
              <option value="f1">Formula 1</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {filteredMatches.length === 0 ? (
          <div className="bg-[#1a1f2e] rounded-xl p-8 sm:p-12 text-center border border-[#2a3042]">
            <div className="text-5xl sm:text-6xl mb-4">⚽</div>
            <h2 className="text-lg sm:text-xl text-white mb-2">No Live Matches</h2>
            <p className="text-gray-400 mb-4 text-sm">There are no live matches at the moment</p>
            <button
              onClick={refreshAll}
              className="px-6 py-2 bg-[#2e7d32] text-white rounded-lg hover:bg-[#1e5a22] transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {Object.entries(groupedMatches).map(([league, leagueMatches]) => (
              <div key={league}>
                <h2 className="text-white font-semibold mb-3 flex items-center text-sm sm:text-base">
                  <span className="w-1 h-4 bg-[#2e7d32] rounded-full mr-2"></span>
                  <span className="truncate">{league}</span>
                  <span className="ml-2 text-xs text-gray-500 flex-shrink-0">({leagueMatches.length})</span>
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {leagueMatches.map((match) => (
                    <MatchCard key={match.id || match._id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-80 hidden lg:block">
        <LiveBetting />
      </div>
    </div>
  );
}