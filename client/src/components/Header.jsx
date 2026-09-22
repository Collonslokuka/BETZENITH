import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBetSlip } from '../context/BetSlipContext';
import { FiUser, FiLogOut, FiMenu, FiX, FiDollarSign, FiTrendingUp, FiSun, FiMoon } from 'react-icons/fi';
import api from '../services/axios';

export default function Header({ onOpenSidebar }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { selectionCount } = useBetSlip();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch balance when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchBalance();

      const handleBalanceUpdate = (event) => {
        if (event.detail && event.detail.newBalance !== undefined) {
          setBalance(event.detail.newBalance);
        }
      };

      window.addEventListener('balance-update', handleBalanceUpdate);

      return () => {
        window.removeEventListener('balance-update', handleBalanceUpdate);
      };
    }
  }, [isAuthenticated, user]);

  const fetchBalance = async () => {
    try {
      const response = await api.get('/payments/balance-simple');
      if (response.data.success) {
        setBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = () => {
    logout();
    setBalance(0);
    navigate('/');
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <header className="bg-[#0f1219] border-b border-[#2a3042] sticky top-0 z-30 ml-0 lg:ml-64">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Left side: hamburger (mobile/tablet) + logo */}
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 text-gray-300 hover:text-[#2e7d32] transition-colors flex-shrink-0"
              aria-label="Open leagues menu"
            >
              <FiMenu size={22} />
            </button>

            {/* Logo - BETZENITH */}
            <Link to="/" className="flex items-center space-x-2 group min-w-0">
              <span className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">
                BET<span className="text-[#2e7d32] group-hover:text-[#3e9142] transition-colors">ZENITH</span>
              </span>
              <span className="hidden sm:inline text-xs bg-[#2e7d32]/10 text-[#2e7d32] px-2 py-1 rounded-full">PREMIUM</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-[#2e7d32] transition-colors text-sm font-medium">
              Homepage
            </Link>
            <Link to="/pre-match" className="text-gray-300 hover:text-[#2e7d32] transition-colors text-sm font-medium">
              Pre-match
            </Link>
            <Link to="/live" className="text-gray-300 hover:text-[#2e7d32] transition-colors text-sm font-medium relative">
              Live
              <span className="absolute -top-1 -right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-[#1a1f2e] border border-[#2a3042] hover:border-[#2e7d32] transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <FiSun className="text-yellow-400" size={18} />
              ) : (
                <FiMoon className="text-gray-400" size={18} />
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Balance */}
                <div className="flex items-center space-x-2 bg-[#1a1f2e] px-4 py-2 rounded-lg border border-[#2a3042]">
                  <FiDollarSign className="text-[#2e7d32]" />
                  <span className="text-white font-bold">KSh {balance.toLocaleString()}</span>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 bg-[#1a1f2e] px-4 py-2 rounded-lg border border-[#2a3042] hover:border-[#2e7d32]/50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#2e7d32]/20 rounded-full flex items-center justify-center">
                      <FiUser className="text-[#2e7d32]" />
                    </div>
                    <span className="text-white text-sm">{user?.username}</span>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#1a1f2e] rounded-lg shadow-xl border border-[#2a3042] overflow-hidden">
                      <div className="p-4 border-b border-[#2a3042]">
                        <p className="text-white font-semibold">{user?.username}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-[#2e7d32] mt-1 font-bold">Balance: KSh {balance.toLocaleString()}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-gray-300 hover:bg-[#2a3042] hover:text-white rounded-lg transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/favorites"
                          className="block px-4 py-2 text-gray-300 hover:bg-[#2a3042] hover:text-white rounded-lg transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Favorites
                        </Link>
                        <Link
                          to="/my-bets"
                          className="block px-4 py-2 text-gray-300 hover:bg-[#2a3042] hover:text-white rounded-lg transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          My Bets
                        </Link>
                        <Link
                          to="/analytics"
                          className="block px-4 py-2 text-gray-300 hover:bg-[#2a3042] hover:text-white rounded-lg transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Analytics
                        </Link>
                        <Link
                          to="/deposit"
                          className="block px-4 py-2 text-green-400 hover:bg-[#2a3042] hover:text-green-300 rounded-lg transition-colors"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          💰 Deposit
                        </Link>
                      </div>
                      <div className="p-2 border-t border-[#2a3042]">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-[#2a3042] hover:text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <FiLogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bet Slip Counter */}
                {selectionCount > 0 && (
                  <Link to="/bet-slip" className="relative">
                    <div className="bg-[#2e7d32] text-white px-3 py-2 rounded-lg flex items-center space-x-2">
                      <FiTrendingUp />
                      <span className="font-bold">{selectionCount}</span>
                    </div>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="px-6 py-2 border border-[#2a3042] text-gray-300 rounded-lg hover:border-[#2e7d32] hover:text-white transition-colors"
                >
                  Login
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile / tablet right side: compact balance + bet slip + account button */}
          <div className="flex items-center space-x-2 md:hidden">
            {isAuthenticated && (
              <Link to="/deposit" className="flex items-center space-x-1 bg-[#1a1f2e] px-2.5 py-1.5 rounded-lg border border-[#2a3042]">
                <FiDollarSign className="text-[#2e7d32]" size={14} />
                <span className="text-white text-xs font-bold">KSh {balance.toLocaleString()}</span>
              </Link>
            )}

            {selectionCount > 0 && (
              <Link to="/bet-slip" className="relative p-2 bg-[#2e7d32] text-white rounded-lg">
                <FiTrendingUp size={16} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {selectionCount}
                </span>
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-300 hover:text-[#2e7d32] transition-colors"
              aria-label="Account menu"
            >
              {isMenuOpen ? <FiX size={22} /> : <FiUser size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#2a3042]">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/"
                className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Homepage
              </Link>
              <Link
                to="/pre-match"
                className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pre-match
              </Link>
              <Link
                to="/live"
                className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors flex items-center justify-between"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>Live</span>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </Link>

              {/* Mobile Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors flex items-center space-x-2"
              >
                {isDarkMode ? (
                  <>
                    <FiSun className="text-yellow-400" size={18} />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <FiMoon className="text-gray-400" size={18} />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>

              {isAuthenticated ? (
                <>
                  <div className="px-4 py-3 bg-[#1a1f2e] rounded-lg border border-[#2a3042]">
                    <p className="text-white font-semibold">{user?.username}</p>
                    <p className="text-sm text-[#2e7d32] font-bold">Balance: KSh {balance.toLocaleString()}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/favorites"
                    className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Favorites
                  </Link>
                  <Link
                    to="/my-bets"
                    className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Bets
                  </Link>
                  <Link
                    to="/analytics"
                    className="px-4 py-3 text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Analytics
                  </Link>
                  <Link
                    to="/deposit"
                    className="px-4 py-3 text-green-400 hover:bg-[#1a1f2e] hover:text-green-300 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    💰 Deposit
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-3 text-left text-gray-300 hover:bg-[#1a1f2e] hover:text-[#2e7d32] rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    to="/login"
                    className="px-4 py-3 border border-[#2a3042] text-gray-300 rounded-lg text-center hover:border-[#2e7d32] hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}