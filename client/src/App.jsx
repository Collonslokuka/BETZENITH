// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BetSlipProvider } from './context/BetSlipContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import LiveMatches from './pages/LiveMatches';
import PreMatch from './pages/PreMatch';
import MatchDetail from './pages/MatchDetail';
import LeaguePage from './pages/LeaguePage';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import BetHistory from './pages/BetHistory';
import BetSlipPage from './pages/BetSlipPage';
import Favorites from './pages/Favorites';
import MyBets from './pages/MyBets';
import Analytics from './pages/Analytics';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ResponsibleGaming from './pages/ResponsibleGaming';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import api from './services/axios';

// Import icons
import {
  GiSoccerBall, GiBasketballBall, GiAmericanFootballHelmet, GiBaseballBat,
  GiHockey, GiCricketBat, GiBoxingGlove
} from 'react-icons/gi';
import { FiStar, FiBarChart2, FiTrendingUp, FiShield } from 'react-icons/fi';

// Component to handle global balance updates
const BalanceSync = ({ children }) => {
  const { user, setUser } = useAuth();

  useEffect(() => {
    // Listen for balance update events from anywhere in the app
    const handleBalanceUpdate = (event) => {
      if (event.detail && event.detail.newBalance !== undefined) {
        console.log('🔄 Balance update received:', event.detail.newBalance);
        
        // Update user balance in context
        if (user) {
          setUser({ ...user, balance: event.detail.newBalance });
        }
        
        // Also update localStorage for persistence
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser) {
          currentUser.balance = event.detail.newBalance;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      }
    };
    
    // Listen for deposit confirmed events
    const handleDepositConfirmed = (event) => {
      if (event.detail) {
        toast.success(`Deposit of ${event.detail.currency} ${event.detail.amount.toLocaleString()} confirmed!`);
      }
    };
    
    window.addEventListener('balance-update', handleBalanceUpdate);
    window.addEventListener('deposit-confirmed', handleDepositConfirmed);
    
    // Fetch initial balance if user is logged in
    const fetchBalance = async () => {
      if (user) {
        try {
          const response = await api.get('/payments/balance-simple');
          if (response.data.success && response.data.data.balance !== user.balance) {
            setUser({ ...user, balance: response.data.data.balance });
          }
        } catch (error) {
          console.error('Error fetching initial balance:', error);
        }
      }
    };
    
    fetchBalance();
    
    return () => {
      window.removeEventListener('balance-update', handleBalanceUpdate);
      window.removeEventListener('deposit-confirmed', handleDepositConfirmed);
    };
  }, [user, setUser]);
  
  return children;
};

function App() {
  const [openAllSports, setOpenAllSports] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  // Responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleAllSports = (sportName) => {
    setOpenAllSports(prev => ({
      ...prev,
      [sportName]: !prev[sportName]
    }));
  };

  // Top Leagues data with updated colors
  const topLeagues = [
    {
      name: 'EPL',
      count: 20,
      icon: <img src="https://media.api-sports.io/football/leagues/39.png" alt="EPL" className="w-5 h-5 object-contain" />
    },
    {
      name: 'UEFA Champions League',
      count: 21,
      icon: <img src="https://media.api-sports.io/football/leagues/2.png" alt="Champions League" className="w-5 h-5 object-contain" />
    },
    {
      name: 'UEFA Europa League',
      count: 24,
      icon: <img src="https://media.api-sports.io/football/leagues/3.png" alt="Europa League" className="w-5 h-5 object-contain" />
    },
    {
      name: 'La Liga - Spain',
      count: 20,
      icon: <img src="https://media.api-sports.io/football/leagues/140.png" alt="La Liga" className="w-5 h-5 object-contain" />
    },
    {
      name: 'Championship',
      count: 24,
      icon: <img src="https://media.api-sports.io/football/leagues/40.png" alt="Championship" className="w-5 h-5 object-contain" />
    },
    {
      name: 'Serie A - Italy',
      count: 19,
      icon: <img src="https://media.api-sports.io/football/leagues/135.png" alt="Serie A" className="w-5 h-5 object-contain" />
    },
    {
      name: 'Bundesliga - Germany',
      count: 20,
      icon: <img src="https://media.api-sports.io/football/leagues/78.png" alt="Bundesliga" className="w-5 h-5 object-contain" />
    },
  ];

  // All Sports data
  const allSportsWithLeagues = [
    {
      name: 'Football',
      icon: <GiSoccerBall className="text-[#2e7d32]" />,
      leagues: [
        { name: 'EPL', logo: <img src="https://media.api-sports.io/football/leagues/39.png" alt="EPL" className="w-4 h-4 object-contain" /> },
        { name: 'UEFA Champions League', logo: <img src="https://media.api-sports.io/football/leagues/2.png" alt="Champions League" className="w-4 h-4 object-contain" /> },
        { name: 'UEFA Europa League', logo: <img src="https://media.api-sports.io/football/leagues/3.png" alt="Europa League" className="w-4 h-4 object-contain" /> },
        { name: 'La Liga - Spain', logo: <img src="https://media.api-sports.io/football/leagues/140.png" alt="La Liga" className="w-4 h-4 object-contain" /> },
        { name: 'Serie A - Italy', logo: <img src="https://media.api-sports.io/football/leagues/135.png" alt="Serie A" className="w-4 h-4 object-contain" /> },
        { name: 'Bundesliga - Germany', logo: <img src="https://media.api-sports.io/football/leagues/78.png" alt="Bundesliga" className="w-4 h-4 object-contain" /> },
        { name: 'Ligue 1 - France', logo: <img src="https://media.api-sports.io/football/leagues/61.png" alt="Ligue 1" className="w-4 h-4 object-contain" /> },
        { name: 'Championship', logo: <img src="https://media.api-sports.io/football/leagues/40.png" alt="Championship" className="w-4 h-4 object-contain" /> }
      ]
    },
    {
      name: 'Basketball',
      icon: <GiBasketballBall className="text-[#2e7d32]" />,
      leagues: [
        { name: 'NBA', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nba.png" alt="NBA" className="w-4 h-4 object-contain" /> },
        { name: 'EuroLeague', logo: <span className="text-xs">🏀</span> },
        { name: 'WNBA', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png" alt="WNBA" className="w-4 h-4 object-contain" /> },
        { name: 'NCAA Basketball', logo: <span className="text-xs">🏀</span> },
      ]
    },
    {
      name: 'American Football',
      icon: <GiAmericanFootballHelmet className="text-[#2e7d32]" />,
      leagues: [
        { name: 'NFL', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" alt="NFL" className="w-4 h-4 object-contain" /> },
        { name: 'NCAAF', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/ncaa.png" alt="NCAAF" className="w-4 h-4 object-contain" /> },
        { name: 'Super Bowl', logo: <span className="text-xs">🏆</span> }
      ]
    },
    {
      name: 'Baseball',
      icon: <GiBaseballBat className="text-[#2e7d32]" />,
      leagues: [
        { name: 'MLB', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png" alt="MLB" className="w-4 h-4 object-contain" /> },
        { name: 'NPB', logo: <span className="text-xs">⚾</span> },
      ]
    },
    {
      name: 'Ice Hockey',
      icon: <GiHockey className="text-[#2e7d32]" />,
      leagues: [
        { name: 'NHL', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png" alt="NHL" className="w-4 h-4 object-contain" /> },
      ]
    },
    {
      name: 'Cricket',
      icon: <GiCricketBat className="text-[#2e7d32]" />,
      leagues: [
        { name: 'IPL', logo: <span className="text-xs">🏏</span> },
        { name: 'The Ashes', logo: <span className="text-xs">🏏</span> },
        { name: 'T20 World Cup', logo: <span className="text-xs">🏆</span> },
      ]
    },
    {
      name: 'MMA',
      icon: <GiBoxingGlove className="text-[#2e7d32]" />,
      leagues: [
        { name: 'UFC', logo: <img src="https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png" alt="UFC" className="w-4 h-4 object-contain" /> },
        { name: 'Boxing', logo: <span className="text-xs">🥊</span> }
      ]
    }
  ];

  // Quick Access
  const quickAccess = [
    { name: 'Favorites', icon: <FiStar className="text-[#2e7d32]" />, path: '/favorites' },
    { name: 'My Bets', icon: <FiBarChart2 className="text-[#2e7d32]" />, path: '/my-bets' },
    { name: 'Analytics', icon: <FiTrendingUp className="text-[#2e7d32]" />, path: '/analytics' },
    { name: 'Responsible Gambling', icon: <FiShield className="text-[#2e7d32]" />, path: '/responsible-gaming' },
  ];

  const handleLeagueClick = (leagueName) => {
    console.log('Navigate to league:', leagueName);
  };

  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <BetSlipProvider>
            <BalanceSync>
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'} text-white transition-colors duration-300`}>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: theme === 'dark' ? '#1a1f2e' : '#ffffff',
                      color: theme === 'dark' ? '#fff' : '#111827',
                      border: theme === 'dark' ? '1px solid #2a3042' : '1px solid #e5e7eb',
                    },
                  }}
                />
                <Routes>
                  <Route
                    element={
                      <Layout
                        topLeagues={topLeagues}
                        allSportsWithLeagues={allSportsWithLeagues}
                        quickAccess={quickAccess}
                        openAllSports={openAllSports}
                        toggleAllSports={toggleAllSports}
                        handleLeagueClick={handleLeagueClick}
                      />
                    }
                  >
                    <Route path="/" element={<Home />} />
                    <Route path="/pre-match" element={<PreMatch />} />
                    <Route path="/live" element={<LiveMatches />} />
                    <Route path="/match/:id" element={<MatchDetail />} />
                    <Route path="/league/:leagueName" element={<LeaguePage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/deposit" element={<Deposit />} />
                    <Route path="/withdraw" element={<Withdraw />} />
                    <Route path="/bet-history" element={<BetHistory />} />
                    <Route path="/bet-slip" element={<BetSlipPage />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/my-bets" element={<MyBets />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
                    <Route path="/login" element={<Auth />} />
                    <Route path="/register" element={<Auth />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                  </Route>
                </Routes>
              </div>
            </BalanceSync>
          </BetSlipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;