// src/pages/Deposit.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/axios';
import toast from 'react-hot-toast';

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [selectedProvider, setSelectedProvider] = useState('mtn');
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  
  const { user, setUser } = useAuth();
  const { currencies, formatAmount, convertAmount } = useCurrency();
  const navigate = useNavigate();

  const predefinedAmounts = {
    KES: [500, 1000, 2500, 5000, 10000, 25000, 50000],
    UGX: [14000, 28000, 70000, 140000, 280000, 700000, 1400000],
    MWK: [6400, 12800, 32000, 64000, 128000, 320000, 640000]
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [selectedCurrency]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/payments/methods');
      if (response.data && response.data.success) {
        setPaymentMethods(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const getCurrentMinDeposit = () => {
    if (selectedCurrency === 'KES') return 500;
    if (selectedCurrency === 'UGX') return 14000;
    return 6400;
  };

  const getCurrencySymbol = () => {
    if (selectedCurrency === 'KES') return 'KSh';
    if (selectedCurrency === 'UGX') return 'USh';
    return 'MK';
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    const minDeposit = getCurrentMinDeposit();
    
    if (isNaN(amountNum) || amountNum < minDeposit) {
      toast.error(`Minimum deposit is ${getCurrencySymbol()} ${minDeposit.toLocaleString()}`);
      return;
    }
    
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }
    
    setLoading(true);
    
    try {
      const requestData = {
        amount: amountNum,
        paymentMethod: selectedCurrency === 'KES' ? 'till' : 'mobile',
        currency: selectedCurrency,
        phoneNumber
      };
      
      // Add provider for Uganda
      if (selectedCurrency === 'UGX') {
        requestData.provider = selectedProvider;
      }
      
      const response = await api.post('/payments/deposit', requestData);
      
      if (response.data && response.data.success) {
        setPendingTransaction(response.data.data);
        
        if (selectedCurrency === 'KES') {
          toast.success('✅ Payment initiated! Check your phone for the M-Pesa prompt.', { duration: 5000 });
          toast('📱 Enter your M-Pesa PIN on your phone to complete the payment.', { duration: 8000, icon: '📱' });
          startPollingForConfirmation(response.data.data.reference);
        } else if (selectedCurrency === 'UGX') {
          toast.success(`✅ ${response.data.message}`, { duration: 8000 });
          // Show payment instructions
          if (response.data.data.paymentInstructions) {
            toast(`📱 Send to: ${response.data.data.paymentInstructions.number}\nReference: ${response.data.data.reference}`, { duration: 10000, icon: '📱' });
          }
          // Auto-navigate after a delay
          setTimeout(() => navigate('/dashboard'), 5000);
        } else {
          toast.success('Deposit initiated! Your balance will be updated shortly.');
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } else {
        toast.error(response.data?.message || 'Failed to initiate deposit');
      }
      
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const startPollingForConfirmation = (reference) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await api.get(`/payments/check-deposit/${reference}`);
        
        if (response.data && response.data.success && response.data.data.status === 'COMPLETED') {
          clearInterval(interval);
          toast.success('✅ Deposit confirmed! Your balance has been updated.');
          
          window.dispatchEvent(new CustomEvent('balance-update', {
            detail: { newBalance: (user?.balance || 0) + parseFloat(amount) }
          }));
          
          setPendingTransaction(null);
          setAmount('');
          setPhoneNumber('');
          navigate('/dashboard');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          toast('⏳ Still waiting for confirmation. Check your M-Pesa messages.', { icon: '⏳' });
        }
      } catch (error) {
        console.error('Error checking deposit status:', error);
      }
    }, 5000);
  };

  // Get phone number placeholder based on currency
  const getPhonePlaceholder = () => {
    if (selectedCurrency === 'KES') return 'e.g., 254712345678 or 0712345678';
    if (selectedCurrency === 'UGX') return 'e.g., 256712345678';
    return 'e.g., 265991234567';
  };

  // Get phone number hint
  const getPhoneHint = () => {
    if (selectedCurrency === 'KES') return 'You will receive an M-Pesa prompt on this number';
    if (selectedCurrency === 'UGX') return 'You will receive a payment request on this number';
    return 'Enter the number registered with your mobile money account';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#1a1f2e] rounded-lg p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Deposit Funds</h1>
        
        <div className="mb-6 p-4 bg-[#2a2f3f] rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Your Balance</p>
          <p className="text-2xl font-bold text-[#00cc88]">
            {getCurrencySymbol()} {user?.balance?.toLocaleString() || 0}
          </p>
        </div>
        
        {/* Currency Selector */}
        <div className="mb-4">
          <label className="block text-gray-400 mb-2 text-sm">Select Currency</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(currencies).map(curr => (
              <button
                key={curr}
                type="button"
                onClick={() => {
                  setSelectedCurrency(curr);
                  setAmount('');
                  setPhoneNumber('');
                }}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  selectedCurrency === curr
                    ? 'bg-[#2e7d32] text-white'
                    : 'bg-[#2a2f3f] text-gray-400 hover:text-white'
                }`}
              >
                {currencies[curr].flag} {curr}
              </button>
            ))}
          </div>
        </div>
        
        {/* Provider selector for Uganda */}
        {selectedCurrency === 'UGX' && (
          <div className="mb-4">
            <label className="block text-gray-400 mb-2 text-sm">Mobile Money Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedProvider('mtn')}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  selectedProvider === 'mtn'
                    ? 'bg-[#2e7d32] text-white'
                    : 'bg-[#2a2f3f] text-gray-400 hover:text-white'
                }`}
              >
                📱 MTN
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider('airtel')}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  selectedProvider === 'airtel'
                    ? 'bg-[#2e7d32] text-white'
                    : 'bg-[#2a2f3f] text-gray-400 hover:text-white'
                }`}
              >
                📱 Airtel
              </button>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-2 text-sm">Phone Number</label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={getPhonePlaceholder()}
            className="w-full px-4 py-2 bg-[#2a2f3f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2e7d32]"
            required
          />
          <p className="text-xs text-gray-500 mt-1">{getPhoneHint()}</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-2 text-sm">Amount ({getCurrencySymbol()})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 bg-[#2a2f3f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2e7d32]"
            placeholder={`Min ${getCurrencySymbol()} ${getCurrentMinDeposit().toLocaleString()}`}
            min={getCurrentMinDeposit()}
            required
          />
        </div>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-2 text-sm">Quick Select</p>
          <div className="grid grid-cols-4 gap-2">
            {predefinedAmounts[selectedCurrency]?.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt)}
                className="py-2 bg-[#2a2f3f] rounded hover:bg-[#353b4d] text-white text-sm"
              >
                {getCurrencySymbol()} {amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        
        {/* Payment Instructions */}
        {selectedCurrency === 'KES' && (
          <div className="mb-6 p-4 bg-[#2e7d32]/10 rounded-lg border border-[#2e7d32]/30">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📱</span>
              <h3 className="text-white font-bold text-sm">M-Pesa Till Number</h3>
            </div>
            <p className="text-3xl font-bold text-[#2e7d32] mb-3 text-center">9960318</p>
            <div className="text-xs text-gray-300">
              <p>You will receive a prompt on your phone</p>
              <p>Enter your M-Pesa PIN to complete payment</p>
            </div>
            <div className="mt-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
              ⚠️ Minimum deposit: {getCurrencySymbol()} {getCurrentMinDeposit().toLocaleString()}
            </div>
          </div>
        )}
        
        {selectedCurrency === 'UGX' && (
          <div className="mb-6 p-4 bg-[#2e7d32]/10 rounded-lg border border-[#2e7d32]/30">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📱</span>
              <h3 className="text-white font-bold text-sm">Mobile Money Payment</h3>
            </div>
            <div className="text-sm text-gray-300 mb-3">
              <p>Send payment to:</p>
              <p className="font-mono text-[#2e7d32] mt-1">
                {selectedProvider === 'mtn' ? 'MTN: +256 777 123 456' : 'Airtel: +256 701 234 567'}
              </p>
            </div>
            <div className="text-xs text-gray-300">
              <p>Use your reference number when sending</p>
              <p>Your balance will be updated within 5 minutes</p>
            </div>
            <div className="mt-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
              ⚠️ Minimum deposit: {getCurrencySymbol()} {getCurrentMinDeposit().toLocaleString()}
            </div>
          </div>
        )}
        
        <button
          onClick={handleDeposit}
          disabled={loading || !amount || !phoneNumber}
          className="w-full py-3 bg-[#2e7d32] text-white rounded-lg font-bold hover:bg-[#1e5a22] transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : selectedCurrency === 'KES' ? 'Pay with M-Pesa' : 'Pay with Mobile Money'}
        </button>
        
        {pendingTransaction && (
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-blue-400 text-sm text-center">
              ⏳ Waiting for payment confirmation...<br />
              Reference: {pendingTransaction.reference}
            </p>
          </div>
        )}
        
        <p className="text-center text-xs text-gray-500 mt-4">
          All transactions are secure and encrypted
        </p>
      </div>
    </div>
  );
}