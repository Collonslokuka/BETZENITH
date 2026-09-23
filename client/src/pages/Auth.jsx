import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BetSlip from '../components/BetSlip';
import { FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import { generatePassword } from '../utils/passwordGenerator';
import toast from 'react-hot-toast';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Read theme from the <html> class so it stays in sync with the header toggle
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Validate username
  const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  // Validate email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Calculate password strength
  const calculatePasswordStrength = (pass) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.length >= 12) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 15;
    if (/[a-z]/.test(pass)) strength += 15;
    if (/[0-9]/.test(pass)) strength += 10;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 10;
    return Math.min(strength, 100);
  };

  // Generate strong password
  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12, true, true, true, true);
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
    toast.success('Strong password generated!');
  };

  const handlePasswordChange = (e) => {
    const newPass = e.target.value;
    setPassword(newPass);
    setPasswordStrength(calculatePasswordStrength(newPass));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(loginEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      // Error already handled in login function
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validate username
    if (!validateUsername(username)) {
      toast.error('Username must be 3-20 characters and can only contain letters, numbers, and underscores');
      return;
    }

    // Validate email
    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate password strength
    if (passwordStrength < 40) {
      toast.error('Please use a stronger password');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      toast.error('Please accept the Terms and Conditions');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      // Switch to login tab after successful registration
      setIsLogin(true);
      setLoginEmail(email);
      toast.success('Registration successful! You can now login.');
    } catch (error) {
      // Error already handled in register function
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0a0c14]' : 'bg-gray-100'} py-8 transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        <div className="flex gap-6">
          {/* Login/Sign Up Form - Left Side */}
          <div className="flex-1">
            <div className="max-w-md mx-auto">
              {/* Header with Logo */}
              <div className="mb-6 text-center">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  BET<span className="text-[#2e7d32]">ZENITH</span>
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
                  Your Premier Sports Betting Platform
                </p>
              </div>

              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3 text-center`}>
                Account Access
              </h2>

              {/* Login/Sign Up Toggle Buttons */}
              <div className="flex space-x-3 mb-6 justify-center">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`px-6 py-2 rounded-lg font-bold transition-all text-sm ${
                    isLogin
                      ? 'bg-[#2e7d32] text-white'
                      : `${isDarkMode ? 'bg-[#1a1f2e] text-gray-400' : 'bg-gray-200 text-gray-600'} hover:text-white border border-[#2a3042]`
                  }`}
                >
                  LOGIN
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`px-6 py-2 rounded-lg font-bold transition-all text-sm ${
                    !isLogin
                      ? 'bg-[#2e7d32] text-white'
                      : `${isDarkMode ? 'bg-[#1a1f2e] text-gray-400' : 'bg-gray-200 text-gray-600'} hover:text-white border border-[#2a3042]`
                  }`}
                >
                  SIGN UP
                </button>
              </div>

              {/* Form Container */}
              <div className={`${isDarkMode ? 'bg-[#0f1219]' : 'bg-white'} rounded-xl border-2 border-[#2a3042] p-5 max-h-[60vh] overflow-y-auto scrollbar-hide`}>
                {isLogin ? (
                  /* Login Form */
                  <>
                    <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                      Login to Your Account
                    </h3>

                    <form onSubmit={handleLogin} className="space-y-3">
                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Email
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm`}
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm pr-10`}
                            placeholder="Enter your password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded border-gray-600" />
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Remember me
                          </span>
                        </label>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-[#2e7d32] hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22] transition-colors disabled:opacity-50 mt-2 text-sm"
                      >
                        {loading ? 'Logging in...' : 'LOGIN'}
                      </button>
                    </form>
                  </>
                ) : (
                  /* Register Form */
                  <>
                    <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                      Create Your Account
                    </h3>

                    <form onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Username <span className="text-gray-500">(letters, numbers, underscore only)</span>
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm`}
                          placeholder="john_doe_123"
                          required
                          minLength={3}
                          maxLength={20}
                          pattern="^[a-zA-Z0-9_]+$"
                          title="Username can only contain letters, numbers, and underscores"
                        />
                        {username && !validateUsername(username) && (
                          <p className="text-red-500 text-xs mt-1">
                            Username must be 3-20 characters and can only contain letters, numbers, and underscores
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm`}
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Phone Number (Optional)
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm`}
                          placeholder="+254 XXX XXX XXX"
                        />
                      </div>

                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Country
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm`}
                        >
                          <option value="">Select Country</option>
                          <option value="Kenya">Kenya 🇰🇪</option>
                          <option value="Uganda">Uganda 🇺🇬</option>
                          <option value="Malawi">Malawi 🇲🇼</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="flex items-center space-x-1 text-xs text-[#2e7d32] hover:underline"
                          >
                            <FiKey size={12} />
                            <span>Generate Strong Password</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={handlePasswordChange}
                            className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm pr-10`}
                            placeholder="Enter your password"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>

                        {/* Password Strength Meter */}
                        {password && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                                  style={{ width: `${passwordStrength}%` }}
                                ></div>
                              </div>
                              <span className={`text-xs ml-2 ${
                                passwordStrength < 40 ? 'text-red-400' :
                                passwordStrength < 70 ? 'text-yellow-400' : 'text-green-400'
                              }`}>
                                {getPasswordStrengthText()}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              Use at least 8 characters with uppercase, lowercase, numbers & symbols
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={`block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 text-xs`}>
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-3 py-2 ${isDarkMode ? 'bg-[#1a1f2e] text-white' : 'bg-gray-100 text-gray-900'} rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2e7d32] border border-[#2a3042] text-sm pr-10`}
                            placeholder="Confirm your password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                          <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className="rounded border-gray-600"
                        />
                        <label htmlFor="terms" className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          I accept the{' '}
                          <button
                            type="button"
                            onClick={() => window.open('/terms', '_blank')}
                            className="text-[#2e7d32] hover:underline"
                          >
                            Terms and Conditions
                          </button>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22] transition-colors disabled:opacity-50 mt-2 text-sm"
                      >
                        {loading ? 'Creating account...' : 'SIGN UP'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Registration Success Message */}
              {!isLogin && (
                <div className={`mt-4 p-3 ${isDarkMode ? 'bg-[#2e7d32]/20' : 'bg-green-50'} rounded-lg border border-[#2e7d32]/30 text-center`}>
                  <p className={`text-xs ${isDarkMode ? 'text-[#2e7d32]' : 'text-green-600'}`}>
                    ✅ Registration successful! You can login immediately.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bet Slip - Right Side */}
          <div className="w-80 hidden lg:block">
            <div className="sticky top-24">
              <BetSlip />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}