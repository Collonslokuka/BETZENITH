// src/services/api.js
import axios from 'axios';

// CHANGED: use env var with render fallback
const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://betzenith-9dx1.onrender.com/api';

console.log('🚀 API_URL is set to:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // CHANGED: was 10000
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle nested data
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
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

// ============ AUTH ============
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (username, email, password) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const refreshToken = async () => {
  const response = await api.post('/auth/refresh-token');
  return response.data;
};

// ============ EMAIL VERIFICATION ============
export const verifyEmail = async (token) => {
  const response = await api.post('/auth/verify-email', { token });
  return response.data;
};

export const resendVerification = async (email) => {
  const response = await api.post('/auth/resend-verification', { email });
  return response.data;
};

export const checkEmailVerified = async () => {
  const response = await api.get('/auth/email-verified');
  return response.data;
};

// ============ PASSWORD MANAGEMENT ============
export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/users/change-password', { currentPassword, newPassword });
  return response.data;
};

// ============ MATCHES ============
export const getMatches = async () => {
  try {
    const response = await api.get('/matches');
    console.log('API Response:', response.data);
    
    if (response.data && response.data.success === true && Array.isArray(response.data.data)) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.matches) {
      return response.data.matches;
    } else {
      console.warn('Unexpected response format:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw error;
  }
};

export const getMatch = async (id) => {
  const response = await api.get(`/matches/${id}`);
  return response.data;
};

export const getLiveMatches = async () => {
  const response = await api.get('/matches/live');
  return response.data;
};

export const getUpcomingMatches = async (days = 7) => {
  const response = await api.get('/matches/upcoming', { params: { days } });
  return response.data;
};

export const getPopularMatches = async (limit = 10) => {
  const response = await api.get('/matches/popular', { params: { limit } });
  return response.data;
};

export const getLeagues = async () => {
  const response = await api.get('/matches/leagues');
  return response.data;
};

// ============ BETS ============
export const placeBet = async (betData) => {
  const response = await api.post('/bets', betData);
  return response.data;
};

export const placeMultiBet = async (selections, stake) => {
  const response = await api.post('/bets/multi', { selections, stake });
  return response.data;
};

export const getMyBets = async (params = {}) => {
  const response = await api.get('/bets/my-bets', { params });
  return response.data;
};

export const getBet = async (id) => {
  const response = await api.get(`/bets/${id}`);
  return response.data;
};

export const getCashoutValue = async (id) => {
  const response = await api.get(`/bets/${id}/cashout`);
  return response.data;
};

export const cashoutBet = async (id) => {
  const response = await api.post(`/bets/${id}/cashout`);
  return response.data;
};

// ============ USER ============
export const updateProfile = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

export const getBalance = async () => {
  const response = await api.get('/users/balance');
  return response.data;
};

export const getTransactions = async (params = {}) => {
  const response = await api.get('/users/transactions', { params });
  return response.data;
};

export const getUserBets = async (limit = 10) => {
  const response = await api.get('/users/bets', { params: { limit } });
  return response.data;
};

export const getNotificationSettings = async () => {
  const response = await api.get('/users/notification-settings');
  return response.data;
};

export const updateNotificationSettings = async (settings) => {
  const response = await api.put('/users/notification-settings', settings);
  return response.data;
};

export const getGamingLimits = async () => {
  const response = await api.get('/users/gaming-limits');
  return response.data;
};

export const updateGamingLimits = async (limits) => {
  const response = await api.put('/users/gaming-limits', limits);
  return response.data;
};

export const selfExclude = async (duration) => {
  const response = await api.post('/users/self-exclude', { duration });
  return response.data;
};

// ============ PAYMENTS ============
export const getPaymentMethods = async () => {
  const response = await api.get('/payments/methods');
  return response.data;
};

export const deposit = async (amount, paymentMethod = 'card') => {
  const response = await api.post('/payments/deposit', { amount, paymentMethod });
  return response.data;
};

export const withdraw = async (amount, paymentMethod = 'bank') => {
  const response = await api.post('/payments/withdraw', { amount, paymentMethod });
  return response.data;
};

export const getPaymentTransactions = async (params = {}) => {
  const response = await api.get('/payments/transactions', { params });
  return response.data;
};

export const getTransaction = async (id) => {
  const response = await api.get(`/payments/${id}`);
  return response.data;
};

// ============ KYC ============
export const submitKYC = async (kycData) => {
  const response = await api.post('/kyc/submit', kycData);
  return response.data;
};

export const getKYCStatus = async () => {
  const response = await api.get('/kyc/status');
  return response.data;
};

export const getKYCSubmission = async () => {
  const response = await api.get('/kyc/submission');
  return response.data;
};

// ============ NOTIFICATIONS ============
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread');
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

// ============ ADMIN ============
export const getUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const updateUserRole = async (id, role) => {
  const response = await api.put(`/admin/users/${id}/role`, { role });
  return response.data;
};

export const toggleUserStatus = async (id, isActive) => {
  const response = await api.put(`/admin/users/${id}/status`, { isActive });
  return response.data;
};

export const adjustUserBalance = async (id, amount, reason) => {
  const response = await api.post(`/admin/users/${id}/balance`, { amount, reason });
  return response.data;
};

export const createMatch = async (matchData) => {
  const response = await api.post('/admin/matches', matchData);
  return response.data;
};

export const updateMatch = async (id, matchData) => {
  const response = await api.put(`/admin/matches/${id}`, matchData);
  return response.data;
};

export const updateMatchOdds = async (id, marketIndex, newOdds) => {
  const response = await api.post(`/admin/matches/${id}/odds`, { marketIndex, newOdds });
  return response.data;
};

export const updateMatchStatus = async (id, status) => {
  const response = await api.post(`/admin/matches/${id}/status`, { status });
  return response.data;
};

export const addMatchEvent = async (id, event) => {
  const response = await api.post(`/admin/matches/${id}/event`, event);
  return response.data;
};

export const updateMatchStats = async (id, stats) => {
  const response = await api.post(`/admin/matches/${id}/stats`, stats);
  return response.data;
};

export const settleMatch = async (id, winner) => {
  const response = await api.post(`/admin/matches/${id}/settle`, { winner });
  return response.data;
};

export const deleteMatch = async (id) => {
  const response = await api.delete(`/admin/matches/${id}`);
  return response.data;
};

export const getAllBets = async (params = {}) => {
  const response = await api.get('/admin/bets', { params });
  return response.data;
};

export const voidBet = async (id) => {
  const response = await api.post(`/admin/bets/${id}/void`);
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

export const getDailyReport = async (date) => {
  const response = await api.get('/admin/reports/daily', { params: { date } });
  return response.data;
};

export const getLeagueReport = async () => {
  const response = await api.get('/admin/reports/leagues');
  return response.data;
};

// ============ LIVE ============
export const getLiveMatchesList = async () => {
  const response = await api.get('/live/matches');
  return response.data;
};

export const getLiveMatch = async (id) => {
  const response = await api.get(`/live/match/${id}`);
  return response.data;
};

export const placeLiveBet = async (id, marketIndex, stake) => {
  const response = await api.post(`/live/bet/${id}`, { marketIndex, stake });
  return response.data;
};

export const getLiveStats = async () => {
  const response = await api.get('/live/stats');
  return response.data;
};

export default api;