import { Link } from 'react-router-dom';
import {
  FiShield, FiChevronDown, FiChevronUp, FiStar, FiBarChart2, FiTrendingUp,
  FiHome, FiCalendar, FiTv, FiLock, FiX
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

// League logos mapping (same as in LeaguePage)
const leagueLogos = {
  'Bundesliga - Germany': '🇩🇪',
  'EPL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'UEFA Champions League': '🏆',
  'La Liga - Spain': '🇪🇸',
  'Ligue 1 - France': '🇫🇷',
  'Serie A - Italy': '🇮🇹',
  'Championship': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Primera División - Argentina': '🇦🇷',
  'Brazil Série A': '🇧🇷',
  'Copa Libertadores': '🏆',
  'Copa Sudamericana': '🏆',
  'FA Cup': '🏆',
  'EFL Cup': '🏆',
  'A-League': '🇦🇺',
  'Denmark Superliga': '🇩🇰',
  'Belgium First Div': '🇧🇪',
  'Austrian Football Bundesliga': '🇦🇹',
  'Primera División - Chile': '🇨🇱',
  'NBA': '🏀',
  'EuroLeague': '🏀',
  'WNBA': '🏀',
  'NCAA Basketball': '🏀',
  'ACB': '🏀',
  'NBL': '🏀',
  'NFL': '🏈',
  'NCAAF': '🏈',
  'CFL': '🏈',
  'XFL': '🏈',
  'Super Bowl': '🏆',
  'MLB': '⚾',
  'MLB Preseason': '⚾',
  'NPB': '⚾',
  'KBO': '⚾',
  'College Baseball': '⚾',
  'NHL': '🏒',
  'KHL': '🏒',
  'World Championship': '🏒',
  'SHL': '🏒',
  'Liiga': '🏒',
  'IPL': '🏏',
  'The Ashes': '🏏',
  'Big Bash': '🏏',
  'T20 World Cup': '🏆',
  'World Cup': '🏆',
  'County Championship': '🏏',
  'UFC': '🥊',
  'Bellator': '🥊',
  'ONE Championship': '🥊',
  'PFL': '🥊',
  'Boxing': '🥊',
};

export default function Sidebar({
  isOpen = false,
  onClose = () => {},
  topLeagues,
  allSportsWithLeagues,
  quickAccess,
  openAllSports,
  toggleAllSports,
  handleLeagueClick
}) {
  const navigate = useNavigate();

  const onLeagueClick = (leagueName) => {
    // Use the passed handleLeagueClick function
    if (handleLeagueClick) {
      handleLeagueClick(leagueName);
    }
    // Navigate to league page
    navigate(`/league/${encodeURIComponent(leagueName)}`);
    onClose();
  };

  return (
    <aside
      className={`w-64 fixed left-0 top-0 h-full bg-[#0f1219] border-r border-[#2a3042] overflow-y-auto z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-4 h-full">
        {/* BETZENITH logo + mobile close button */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-white" onClick={onClose}>
            BET<span className="text-[#00b3b3]">ZENITH</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-[#1a1f2e] transition-colors"
            aria-label="Close menu"
          >
            <FiX className="text-gray-400" size={20} />
          </button>
        </div>

        {/* Homepage, Pre-match, Live */}
        <div className="mb-6">
          <Link
            to="/"
            className="flex items-center space-x-3 px-3 py-2 bg-[#1a1f2e] rounded-lg mb-1"
            onClick={onClose}
          >
            <FiHome className="text-[#00b3b3]" size={18} />
            <span className="text-white text-sm font-medium">Homepage</span>
          </Link>
          <Link
            to="/pre-match"
            className="flex items-center space-x-3 px-3 py-2 hover:bg-[#1a1f2e] rounded-lg mb-1 cursor-pointer transition-colors"
            onClick={onClose}
          >
            <FiCalendar className="text-gray-400" size={18} />
            <span className="text-gray-400 hover:text-white text-sm font-medium">Pre-match</span>
          </Link>
          <Link
            to="/live"
            className="flex items-center space-x-3 px-3 py-2 hover:bg-[#1a1f2e] rounded-lg mb-1 cursor-pointer transition-colors"
            onClick={onClose}
          >
            <FiTv className="text-gray-400" size={18} />
            <span className="text-gray-400 hover:text-white text-sm font-medium flex items-center">
              Live
              <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            </span>
          </Link>
        </div>

        {/* Top Leagues Section - UPDATED with logos and clickable */}
        <div className="mb-6">
          <h3 className="text-white text-sm font-semibold mb-3">TOP LEAGUES</h3>
          <div className="space-y-1">
            {topLeagues.map((league) => (
              <button
                key={league.name}
                onClick={() => onLeagueClick(league.name)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 hover:bg-[#1a1f2e] hover:text-white rounded transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center text-base">
                  {league.icon ? (
                    <span className="w-5 h-5 flex items-center justify-center">
                      {league.icon}
                    </span>
                  ) : (
                    leagueLogos[league.name] || '🏆'
                  )}
                </span>
                <span className="truncate">{league.name}</span>
                <span className="ml-auto text-[#00b3b3] text-xs">{league.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* All Sports Section - UPDATED with logos and clickable leagues */}
        <div className="mb-6">
          <h3 className="text-white text-sm font-semibold mb-3">ALL SPORTS</h3>
          <div className="space-y-1">
            {allSportsWithLeagues.map((sport) => (
              <div key={sport.name} className="mb-1">
                <button
                  onClick={() => toggleAllSports(sport.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:bg-[#1a1f2e] hover:text-white rounded transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-lg">{sport.icon}</span>
                    <span>{sport.name}</span>
                  </span>
                  {openAllSports[sport.name] ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>
                {openAllSports[sport.name] && (
                  <div className="mt-1 ml-8 space-y-1">
                    {sport.leagues.map((league) => (
                      <button
                        key={league.name || league}
                        onClick={() => onLeagueClick(league.name || league)}
                        className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-[#1a1f2e] px-2 py-1 rounded transition-colors flex items-center space-x-2"
                      >
                        <span className="w-4 h-4 flex items-center justify-center text-sm">
                          {league.logo ? league.logo : (leagueLogos[league.name || league] || '🏆')}
                        </span>
                        <span>{league.name || league}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="mb-6">
          <h3 className="text-white text-sm font-semibold mb-3">QUICK ACCESS</h3>
          <div className="space-y-1">
            {quickAccess.map(item => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-400 hover:bg-[#1a1f2e] hover:text-white rounded transition-colors"
                onClick={onClose}
              >
                <span className="text-[#00b3b3]">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Responsible Gambling */}
        <div className="mt-8 pt-4 border-t border-[#2a3042]">
          <Link
            to="/responsible-gaming"
            className="text-xs text-gray-500 hover:text-[#00b3b3] transition-colors flex items-center"
            onClick={onClose}
          >
            <FiShield className="mr-2 text-yellow-500" size={12} />
            Responsible Gambling
          </Link>
        </div>
      </div>
    </aside>
  );
}