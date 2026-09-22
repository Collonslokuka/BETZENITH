// src/pages/PreMatch.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import BetSlip from '../components/BetSlip';
import { useOddsData } from '../hooks/useOddsData';
import { useBetSlip } from '../context/BetSlipContext';
import { FiFilter, FiCalendar } from 'react-icons/fi';

export default function PreMatch() {
  const [filteredSport, setFilteredSport] = useState('all');
  const [selectedDate, setSelectedDate] = useState('today');
  const { liveEvents, upcomingEvents, loading } = useOddsData('all');
  const { selections } = useBetSlip();

  const allEvents = [...liveEvents, ...upcomingEvents];
  
  const preMatchEvents = allEvents.filter(match => 
    match.status === 'SCHEDULED' || 
    (match.status === 'FIRST_HALF' && match.minute < 10) ||
    (match.status === 'LIVE' && match.minute < 10)
  );

  const filteredMatches = filteredSport === 'all' 
    ? preMatchEvents 
    : preMatchEvents.filter(m => m.sport === filteredSport);

  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const league = match.league || 'Other';
    if (!groups[league]) groups[league] = [];
    groups[league].push(match);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-[#2e7d32] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading pre-match events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c14] py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Pre-match</h1>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center space-x-2 bg-[#1a1f2e] px-3 sm:px-4 py-2 rounded-lg border border-[#2a3042]">
                  <FiCalendar className="text-[#2e7d32] flex-shrink-0" />
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white focus:outline-none text-sm flex-1"
                  >
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="week">This Week</option>
                  </select>
                </div>
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
                  </select>
                </div>
              </div>
            </div>

            {/* Matches */}
            {Object.keys(groupedMatches).length === 0 ? (
              <div className="bg-[#1a1f2e] rounded-lg p-8 sm:p-12 text-center border border-[#2a3042]">
                <p className="text-gray-400 text-sm">No pre-match events available</p>
              </div>
            ) : (
              Object.entries(groupedMatches).map(([league, leagueMatches]) => (
                <div key={league} className="mb-5 sm:mb-6">
                  <h2 className="text-white font-semibold mb-3 flex items-center text-sm sm:text-base">
                    <span className="w-1 h-4 bg-[#2e7d32] rounded-full mr-2"></span>
                    <span className="truncate">{league}</span>
                    <span className="ml-2 text-xs text-gray-500 flex-shrink-0">({leagueMatches.length})</span>
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {leagueMatches.map(match => (
                      <MatchCard key={match.id || match._id} match={match} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bet Slip (desktop only) */}
          <div className="w-80 hidden lg:block">
            <div className="sticky top-24">
              <BetSlip />
            </div>
          </div>
        </div>

        {/* Mobile Bet Slip Button */}
        {selections.length > 0 && (
          <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
            <Link
              to="/bet-slip"
              className="w-full bg-[#2e7d32] text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center"
            >
              Bet Slip ({selections.length})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}