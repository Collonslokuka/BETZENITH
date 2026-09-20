import axios from 'axios';

// ============ HYBRID CONFIGURATION ============
// Mock data for content, real API for auth/email
const USE_MOCK_FOR_MATCHES = true;  // Mock matches, live scores, odds
const USE_REAL_FOR_AUTH = true;     // Always use real auth/email

// CHANGED: fallback points to render instead of localhost
const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://betzenith-9dx1.onrender.com/api';

console.log('🔧 ==================================');
console.log(`🔧 Matches & Odds: ${USE_MOCK_FOR_MATCHES ? '📊 MOCK DATA' : '🌐 REAL API'}`);
console.log(`🔧 Auth & Email: ${USE_REAL_FOR_AUTH ? '🌐 REAL API' : '📊 MOCK DATA'}`);
console.log(`🔧 API URL: ${API_URL}`);
console.log('🔧 ==================================');

// CHANGED: import mock generators from data file instead of the hook
import { generateMockMatches, generateMockLiveMatches, generateMockUpcomingMatches } from '../data/mockMatches';

// ============ REAL API CLIENT ============
export const realApi = axios.create({
  baseURL: API_URL,
  timeout: 60000, // CHANGED: was 10000
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to real API requests
realApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
realApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ MOCK DATA HELPERS ============
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const mockDelay = async () => await delay(300);

// ============ MOCK DATA STORAGE ============
let cachedMatches = null;
let cachedLiveMatches = null;
let cachedUpcomingMatches = null;

const refreshMockData = () => {
  cachedMatches = generateMockMatches();
  cachedLiveMatches = generateMockLiveMatches();
  cachedUpcomingMatches = generateMockUpcomingMatches();
};

// Initial load
refreshMockData();

// Refresh mock data every 30 seconds (like real API)
setInterval(() => {
  refreshMockData();
  console.log('🔄 Mock data refreshed at', new Date().toLocaleTimeString());
}, 30000);

// ============ HYBRID API CLIENT ============
export const apiClient = {
  // ============ MATCHES & ODDS (ALWAYS MOCK) ============
  getMatches: async () => {
    if (USE_MOCK_FOR_MATCHES) {
      await mockDelay();
      console.log('📊 [MOCK] Getting all matches');
      return cachedMatches || generateMockMatches();
    }
    const response = await realApi.get('/matches');
    return response.data?.data || response.data || [];
  },

  getLiveMatches: async () => {
    if (USE_MOCK_FOR_MATCHES) {
      await mockDelay();
      console.log('📊 [MOCK] Getting live matches');
      return cachedLiveMatches || generateMockLiveMatches();
    }
    const response = await realApi.get('/matches/live');
    return response.data?.data || response.data || [];
  },

  getUpcomingMatches: async (days = 7) => {
    if (USE_MOCK_FOR_MATCHES) {
      await mockDelay();
      console.log('📊 [MOCK] Getting upcoming matches');
      return cachedUpcomingMatches || generateMockUpcomingMatches(days);
    }
    const response = await realApi.get('/matches/upcoming', { params: { days } });
    return response.data?.data || response.data || [];
  },

  getMatchById: async (id) => {
    if (USE_MOCK_FOR_MATCHES) {
      await mockDelay();
      console.log('📊 [MOCK] Getting match by ID:', id);
      const matches = cachedMatches || generateMockMatches();
      return matches.find(m => m.id === id || m._id === id) || null;
    }
    const response = await realApi.get(`/matches/${id}`);
    return response.data?.data || response.data;
  },

  // ============ AUTH & EMAIL (ALWAYS REAL) ============
  login: async (email, password) => {
    console.log('🌐 [REAL] Login attempt for:', email);
    try {
      const response = await realApi.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  register: async (username, email, password) => {
    console.log('🌐 [REAL] Registration for:', email);
    try {
      const response = await realApi.post('/auth/register', { username, email, password });
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  logout: async () => {
    console.log('🌐 [REAL] Logout');
    try {
      const response = await realApi.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  },

  getProfile: async () => {
    console.log('🌐 [REAL] Getting profile');
    try {
      const response = await realApi.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('❌ Profile error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ============ EMAIL VERIFICATION (ALWAYS REAL) ============
  verifyEmail: async (token) => {
    console.log('📧 [REAL] Verifying email with token');
    try {
      const response = await realApi.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      console.error('❌ Verification error:', error.response?.data || error.message);
      throw error;
    }
  },

  resendVerification: async (email) => {
    console.log('📧 [REAL] Resending verification to:', email);
    try {
      const response = await realApi.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      console.error('❌ Resend error:', error.response?.data || error.message);
      throw error;
    }
  },

  checkEmailVerified: async () => {
    console.log('📧 [REAL] Checking email verification status');
    try {
      const response = await realApi.get('/auth/email-verified');
      return response.data;
    } catch (error) {
      console.error('❌ Check verification error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ============ PASSWORD MANAGEMENT (ALWAYS REAL) ============
  forgotPassword: async (email) => {
    console.log('🔑 [REAL] Forgot password for:', email);
    try {
      const response = await realApi.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('❌ Forgot password error:', error.response?.data || error.message);
      throw error;
    }
  },

  resetPassword: async (token, password) => {
    console.log('🔑 [REAL] Resetting password');
    try {
      const response = await realApi.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      console.error('❌ Reset password error:', error.response?.data || error.message);
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    console.log('🔑 [REAL] Changing password');
    try {
      const response = await realApi.put('/users/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      console.error('❌ Change password error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ============ BETS (Optional: Mix real and mock) ============
  placeBet: async (betData) => {
    console.log('🎲 [MOCK] Placing bet:', betData);
    await mockDelay();
    
    return {
      success: true,
      data: {
        id: 'mock-bet-' + Date.now(),
        ...betData,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }
    };
  },

  getMyBets: async (params = {}) => {
    console.log('🎲 [MOCK] Getting my bets');
    await mockDelay();
    
    const mockBets = Array(8).fill().map((_, i) => ({
      id: `mock-bet-${i}`,
      match: {
        homeTeam: { name: `Team ${String.fromCharCode(65 + i)}`, abbreviation: `T${i}` },
        awayTeam: { name: `Team ${String.fromCharCode(75 + i)}`, abbreviation: `T${i+10}` },
        league: i % 2 === 0 ? 'Premier League' : 'La Liga'
      },
      market: i % 3 === 0 ? '1' : i % 3 === 1 ? 'X' : '2',
      odds: (1.5 + i * 0.3).toFixed(2),
      stake: 500 + i * 100,
      potentialWin: (500 + i * 100) * (1.5 + i * 0.3),
      status: i % 4 === 0 ? 'WON' : i % 4 === 1 ? 'LOST' : i % 4 === 2 ? 'PENDING' : 'CASHED_OUT',
      createdAt: new Date(Date.now() - i * 86400000).toISOString()
    }));
    
    let filtered = mockBets;
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(b => b.status === params.status);
    }
    
    return {
      success: true,
      data: filtered,
      pagination: {
        total: filtered.length,
        page: 1,
        limit: 20,
        pages: 1
      }
    };
  },

  // ============ PAYMENTS (Mock for testing) ============
  deposit: async (amount, paymentMethod = 'card') => {
    console.log('💰 [MOCK] Deposit:', { amount, paymentMethod });
    await mockDelay();
    return { 
      success: true, 
      message: 'Deposit successful',
      data: { 
        newBalance: 5000 + amount,
        transaction: {
          id: 'mock-txn-' + Date.now(),
          amount,
          type: 'DEPOSIT',
          status: 'COMPLETED'
        }
      } 
    };
  },

  withdraw: async (amount, paymentMethod = 'bank') => {
    console.log('💰 [MOCK] Withdraw:', { amount, paymentMethod });
    await mockDelay();
    return { 
      success: true, 
      message: 'Withdrawal initiated',
      data: { 
        newBalance: 5000 - amount,
        transaction: {
          id: 'mock-txn-' + Date.now(),
          amount: -amount,
          type: 'WITHDRAWAL',
          status: 'PROCESSING'
        }
      } 
    };
  },

  // ============ USER PROFILE (Mix - get real balance) ============
  getBalance: async () => {
    console.log('🌐 [REAL] Getting balance');
    try {
      const response = await realApi.get('/users/balance');
      return response.data;
    } catch (error) {
      console.error('❌ Balance error:', error);
      return { success: true, data: { balance: 5000 } };
    }
  },

  updateProfile: async (profileData) => {
    console.log('🌐 [REAL] Updating profile');
    try {
      const response = await realApi.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  },

  // ============ NOTIFICATIONS (Real API) ============
  getNotifications: async () => {
    console.log('🌐 [REAL] Getting notifications');
    try {
      const response = await realApi.get('/notifications');
      return response.data;
    } catch (error) {
      console.error('❌ Notifications error:', error);
      return { success: true, data: [] };
    }
  },

  getUnreadCount: async () => {
    console.log('🌐 [REAL] Getting unread count');
    try {
      const response = await realApi.get('/notifications/unread');
      return response.data;
    } catch (error) {
      console.error('❌ Unread count error:', error);
      return { success: true, data: { unread: 0 } };
    }
  },

  markAsRead: async (id) => {
    console.log('🌐 [REAL] Marking notification as read:', id);
    try {
      const response = await realApi.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      throw error;
    }
  },

  // ============ KYC (Real API) ============
  submitKYC: async (kycData) => {
    console.log('🌐 [REAL] Submitting KYC');
    try {
      const response = await realApi.post('/kyc/submit', kycData);
      return response.data;
    } catch (error) {
      console.error('❌ KYC error:', error);
      throw error;
    }
  },

  getKYCStatus: async () => {
    console.log('🌐 [REAL] Getting KYC status');
    try {
      const response = await realApi.get('/kyc/status');
      return response.data;
    } catch (error) {
      console.error('❌ KYC status error:', error);
      return { success: true, data: { status: 'NOT_SUBMITTED' } };
    }
  },

  // ============ ADMIN (Mix based on needs) ============
  getAdminStats: async () => {
    console.log('👑 [MOCK] Getting admin stats');
    await mockDelay();
    
    return {
      success: true,
      data: {
        users: { total: 1250, today: 47, active: 890 },
        matches: { total: 345, live: 23, today: 56, finished: 267 },
        bets: { total: 5678, pending: 234, today: 156 },
        volume: { totalStake: 1250000, totalPayout: 980000, profit: 270000 },
        transactions: { totalDeposits: 850000, totalWithdrawals: 420000, pendingWithdrawals: 12 }
      }
    };
  },

  getUsers: async (params = {}) => {
    console.log('🌐 [REAL] Getting users list');
    try {
      const response = await realApi.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Get users error:', error);
      return {
        success: true,
        data: Array(10).fill().map((_, i) => ({
          id: `mock-user-${i}`,
          username: `user${i}`,
          email: `user${i}@example.com`,
          balance: 1000 + i * 500,
          role: i === 0 ? 'admin' : 'user'
        }))
      };
    }
  },

  updateUserRole: async (id, role) => {
    console.log('🌐 [REAL] Updating user role');
    try {
      const response = await realApi.put(`/admin/users/${id}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('❌ Update role error:', error);
      throw error;
    }
  }
};

// Export both clients
export { realApi };