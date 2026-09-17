// server/config/mpesa.js
require('dotenv').config();

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  passkey: process.env.MPESA_PASSKEY,
  shortcode: process.env.MPESA_SHORTCODE || '9960318',
  environment: process.env.MPESA_ENVIRONMENT || 'production',

  callbackUrl:
    process.env.MPESA_CALLBACK_URL ||
    'https://betzenith-9dx1.onrender.com/api/payments/mpesa-callback',

  get baseUrl() {
    return this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  },
};

if (!MPESA_CONFIG.consumerKey || !MPESA_CONFIG.consumerSecret) {
  console.warn('⚠️  M-Pesa credentials missing in .env — deposits will fail');
}

module.exports = MPESA_CONFIG;