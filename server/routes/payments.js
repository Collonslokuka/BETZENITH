// server/routes/payments.js
const express = require('express');
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const axios = require('axios');
const MPESA_CONFIG = require('../config/mpesa');

const router = express.Router();

// In-memory pending deposits (use Redis in prod)
const pendingDeposits = new Map();

const EXCHANGE_RATES = { KES: 1, UGX: 28.5, MWK: 12.8 };

const PAYMENT_METHODS = {
  KES: {
    currency: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    flag: '🇰🇪',
    minDeposit: parseInt(process.env.MINIMUM_DEPOSIT) || 100,
    tillNumber: process.env.MPESA_TILL_NUMBER || '9960318',
    methods: [
      {
        id: 'till',
        name: 'M-Pesa STK Push',
        number: process.env.MPESA_TILL_NUMBER || '9960318',
        type: 'Till Number',
        action: 'Pay with M-Pesa',
      },
    ],
  },
  UGX: {
    currency: 'UGX',
    symbol: 'USh',
    name: 'Ugandan Shilling',
    flag: '🇺🇬',
    minDeposit: 14000,
    mobileNumber: process.env.UGANDA_MOBILE_NUMBER,
    methods: [
      { id: 'mtn', name: 'MTN Mobile Money', provider: 'mtn' },
      { id: 'airtel', name: 'Airtel Money', provider: 'airtel' },
    ],
  },
  MWK: {
    currency: 'MWK',
    symbol: 'MK',
    name: 'Malawian Kwacha',
    flag: '🇲🇼',
    minDeposit: 6400,
    mobileNumber: process.env.MALAWI_MOBILE_NUMBER,
    methods: [{ id: 'airtel', name: 'Airtel Money', provider: 'airtel' }],
  },
};

// ============================================================
//  M-PESA HELPERS
// ============================================================

async function getMpesaAccessToken() {
  try {
    const auth = Buffer.from(
      `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
    ).toString('base64');

    const url = `${MPESA_CONFIG.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

    console.log('🔑 Requesting M-Pesa access token...');
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 15000,
    });

    console.log('✅ M-Pesa access token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ M-Pesa token error:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    return null;
  }
}

function formatPhoneNumber(phoneNumber) {
  let formatted = phoneNumber.replace(/\D/g, '');
  if (formatted.startsWith('0')) formatted = '254' + formatted.substring(1);
  else if (formatted.startsWith('+')) formatted = formatted.substring(1);
  else if (formatted.length === 9 && !formatted.startsWith('254'))
    formatted = '254' + formatted;

  if (formatted.length !== 12 || !formatted.startsWith('254')) {
    throw new Error('Invalid Kenyan phone number. Use 2547XXXXXXXX');
  }
  return formatted;
}

function generateTimestamp() {
  const n = new Date();
  return (
    n.getFullYear() +
    String(n.getMonth() + 1).padStart(2, '0') +
    String(n.getDate()).padStart(2, '0') +
    String(n.getHours()).padStart(2, '0') +
    String(n.getMinutes()).padStart(2, '0') +
    String(n.getSeconds()).padStart(2, '0')
  );
}

async function initiateSTKPush(phoneNumber, amount, accountReference) {
  console.log('📱 Initiating STK Push...', { phoneNumber, amount, accountReference });
  try {
    const token = await getMpesaAccessToken();
    if (!token)
      return { success: false, message: 'Failed to authenticate with M-Pesa.' };

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const timestamp = generateTimestamp();

    const businessShortCode =
      MPESA_CONFIG.environment === 'sandbox' ? '174379' : MPESA_CONFIG.shortcode;

    const password = Buffer.from(
      `${businessShortCode}${MPESA_CONFIG.passkey}${timestamp}`
    ).toString('base64');

    const url = `${MPESA_CONFIG.baseUrl}/mpesa/stkpush/v1/processrequest`;

    const requestBody = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CONFIG.callbackUrl,
      AccountReference: accountReference.substring(0, 12),
      TransactionDesc: 'BetZenith Deposit',
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('📥 STK Push response:', response.data);

    if (response.data.ResponseCode === '0') {
      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        customerMessage: response.data.CustomerMessage,
      };
    }
    return {
      success: false,
      message: response.data.ResponseDescription || 'Payment initiation failed',
    };
  } catch (error) {
    console.error('❌ STK Push exception:', error.message);
    if (error.response) console.error('Response data:', error.response.data);
    return {
      success: false,
      message:
        error.response?.data?.errorMessage || error.message || 'Payment failed',
    };
  }
}

// ============================================================
//  ROUTES
// ============================================================

router.get('/methods', protect, (req, res) => {
  const userCurrency = req.user?.currency || 'KES';
  res.json({
    success: true,
    data: PAYMENT_METHODS[userCurrency] || PAYMENT_METHODS.KES,
  });
});

router.post('/deposit', protect, async (req, res) => {
  console.log('💰 Deposit endpoint called');
  try {
    const {
      amount,
      paymentMethod = 'till',
      currency = 'KES',
      phoneNumber,
      provider,
    } = req.body;

    const user = await User.findById(req.user._id);
    const depositAmount = Number(amount);
    const currencyConfig = PAYMENT_METHODS[currency];

    if (!currencyConfig)
      return res.status(400).json({ success: false, message: `Unsupported currency: ${currency}` });

    if (depositAmount < currencyConfig.minDeposit)
      return res.status(400).json({
        success: false,
        message: `Minimum deposit is ${currencyConfig.symbol} ${currencyConfig.minDeposit.toLocaleString()}`,
      });

    if (!phoneNumber)
      return res.status(400).json({ success: false, message: 'Phone number is required' });

    const reference = `DEP${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    let amountInKES = depositAmount;
    if (currency !== 'KES') amountInKES = depositAmount / EXCHANGE_RATES[currency];

    const transaction = await Transaction.create({
      user: user._id,
      type: 'DEPOSIT',
      amount: depositAmount,
      amountInKES,
      currency,
      status: 'PENDING',
      paymentMethod,
      reference,
      description: `Deposit of ${currencyConfig.symbol} ${depositAmount.toLocaleString()}`,
      metadata: { phoneNumber, provider, initiatedAt: new Date().toISOString() },
    });

    if (currency === 'KES' && paymentMethod === 'till') {
      const paymentResponse = await initiateSTKPush(phoneNumber, depositAmount, reference);

      if (paymentResponse.success) {
        pendingDeposits.set(reference, {
          userId: user._id.toString(),
          amount: depositAmount,
          amountInKES,
          phoneNumber,
          checkoutRequestId: paymentResponse.checkoutRequestId,
          merchantRequestId: paymentResponse.merchantRequestId,
          transactionId: transaction._id.toString(),
          createdAt: Date.now(),
        });

        transaction.metadata.checkoutRequestId = paymentResponse.checkoutRequestId;
        transaction.metadata.merchantRequestId = paymentResponse.merchantRequestId;
        await transaction.save();

        return res.json({
          success: true,
          message:
            paymentResponse.customerMessage ||
            'STK Push sent. Check your phone for the M-Pesa prompt.',
          data: {
            reference,
            amount: depositAmount,
            currency,
            symbol: currencyConfig.symbol,
            checkoutRequestId: paymentResponse.checkoutRequestId,
            status: 'pending',
          },
        });
      } else {
        transaction.status = 'FAILED';
        transaction.metadata.error = paymentResponse.message;
        await transaction.save();
        return res.status(400).json({ success: false, message: paymentResponse.message });
      }
    }

    if (currency === 'UGX' || currency === 'MWK') {
      const mobileNumber = currencyConfig.mobileNumber;
      const selectedMethod =
        currencyConfig.methods.find((m) => m.provider === provider) ||
        currencyConfig.methods[0];

      transaction.status = 'PROCESSING';
      transaction.metadata.manualProcessing = true;
      transaction.metadata.paymentNumber = mobileNumber;
      transaction.metadata.providerName = selectedMethod.name;
      await transaction.save();

      return res.json({
        success: true,
        message: `Send ${currencyConfig.symbol} ${depositAmount.toLocaleString()} to ${mobileNumber}`,
        data: {
          reference,
          amount: depositAmount,
          currency,
          symbol: currencyConfig.symbol,
          status: 'processing',
          paymentInstructions: {
            provider: selectedMethod.name,
            number: mobileNumber,
            reference,
            amount: `${currencyConfig.symbol} ${depositAmount.toLocaleString()}`,
          },
        },
      });
    }
  } catch (error) {
    console.error('❌ Deposit error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ============================================================
//  M-PESA CALLBACK
// ============================================================
router.post('/mpesa-callback', async (req, res) => {
  console.log('📞 M-Pesa Callback received');
  console.log('   Body:', JSON.stringify(req.body, null, 2));

  try {
    const { Body } = req.body;
    if (!Body || !Body.stkCallback)
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = Body.stkCallback;

    console.log(`📊 Callback: ResultCode=${ResultCode}, ResultDesc=${ResultDesc}`);

    let pending = null;
    let transaction = null;

    for (const [ref, p] of pendingDeposits.entries()) {
      if (p.checkoutRequestId === CheckoutRequestID) {
        pending = p;
        transaction = await Transaction.findById(p.transactionId);
        break;
      }
    }

    if (!transaction) {
      transaction = await Transaction.findOne({
        'metadata.checkoutRequestId': CheckoutRequestID,
      });
    }

    if (!transaction) {
      console.log('⚠️  Transaction not found');
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (transaction.status !== 'PENDING') {
      console.log(`⚠️  Already ${transaction.status}`);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (ResultCode === 0) {
      let amount = 0, phoneNumber = '', mpesaReceipt = '';
      if (CallbackMetadata?.Item) {
        CallbackMetadata.Item.forEach((item) => {
          if (item.Name === 'Amount') amount = item.Value;
          if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
          if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
        });
      }

      const user = await User.findById(transaction.user);
      const oldBalance = user.balance;
      user.balance += transaction.amountInKES;
      await user.save();

      transaction.status = 'COMPLETED';
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        mpesaReceipt,
        merchantRequestId: MerchantRequestID,
        checkoutRequestId: CheckoutRequestID,
        confirmedAt: new Date().toISOString(),
        amount,
        phoneNumber,
      };
      transaction.balance = { before: oldBalance, after: user.balance };
      await transaction.save();

      if (pending) pendingDeposits.delete(transaction.reference);

      const io = req.app.get('io');
      if (io) {
        io.to(`user-${user._id}`).emit('balance-update', {
          newBalance: user.balance,
          amount: transaction.amount,
          currency: transaction.currency,
        });
        io.to(`user-${user._id}`).emit('deposit-confirmed', {
          reference: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
        });
      }

      console.log(`✅ Deposit confirmed for ${user.username}: ${transaction.amount} ${transaction.currency}`);
    } else {
      transaction.status = 'FAILED';
      transaction.metadata.resultDesc = ResultDesc;
      transaction.metadata.resultCode = ResultCode;
      await transaction.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`user-${transaction.user}`).emit('deposit-failed', {
          reference: transaction.reference,
          reason: ResultDesc,
        });
      }
      console.log(`❌ Deposit failed: ${ResultDesc}`);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('❌ Callback error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Failed' });
  }
});

// ============================================================
//  STATUS / BALANCE
// ============================================================
router.get('/check-deposit/:reference', protect, async (req, res) => {
  try {
    const { reference } = req.params;
    const transaction = await Transaction.findOne({
      reference,
      user: req.user._id,
    });

    if (!transaction)
      return res.status(404).json({ success: false, message: 'Not found' });

    res.json({
      success: true,
      data: {
        status: transaction.status,
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        createdAt: transaction.createdAt,
        processedAt: transaction.processedAt,
        checkoutRequestId: transaction.metadata?.checkoutRequestId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/confirm-payment/:reference', protect, admin, async (req, res) => {
  try {
    const { reference } = req.params;
    const transaction = await Transaction.findOne({ reference });

    if (!transaction)
      return res.status(404).json({ success: false, message: 'Not found' });
    if (transaction.status !== 'PROCESSING')
      return res.status(400).json({
        success: false,
        message: `Cannot confirm. Status: ${transaction.status}`,
      });

    const user = await User.findById(transaction.user);
    const oldBalance = user.balance;
    user.balance += transaction.amountInKES;
    await user.save();

    transaction.status = 'COMPLETED';
    transaction.processedAt = new Date();
    transaction.metadata.confirmedBy = req.user._id;
    transaction.balance = { before: oldBalance, after: user.balance };
    await transaction.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user._id}`).emit('balance-update', {
        newBalance: user.balance,
        amount: transaction.amount,
        currency: transaction.currency,
      });
    }

    res.json({
      success: true,
      message: 'Payment confirmed',
      data: { user: user.username, newBalance: user.balance },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/balance', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: {
        balance: user.balance,
        currency: user.currency || 'KES',
        balances: {
          KES: user.balance,
          UGX: user.balance * EXCHANGE_RATES.UGX,
          MWK: user.balance * EXCHANGE_RATES.MWK,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Debug endpoint — remove in prod
router.get('/test-mpesa-auth', async (req, res) => {
  const token = await getMpesaAccessToken();
  res.json({
    success: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : null,
    environment: MPESA_CONFIG.environment,
    callbackUrl: MPESA_CONFIG.callbackUrl,
    shortcode: MPESA_CONFIG.shortcode,
  });
});

module.exports = router;