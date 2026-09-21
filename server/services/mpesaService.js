// server/services/mpesaService.js
const axios = require('axios');
const MPESA_CONFIG = require('../config/mpesa');

class MpesaService {
  constructor() {
    this.consumerKey = MPESA_CONFIG.consumerKey;
    this.consumerSecret = MPESA_CONFIG.consumerSecret;
    this.passkey = MPESA_CONFIG.passkey;
    // Store Number → used for STK Push
    this.storeNumber = process.env.MPESA_STORE_NUMBER || MPESA_CONFIG.shortcode;
    // Till Number → display only
    this.tillNumber = process.env.MPESA_TILL_NUMBER || '8595330';
    this.callbackUrl = MPESA_CONFIG.callbackUrl;
    this.baseUrl = MPESA_CONFIG.baseUrl;
  }

  async getAccessToken() {
    const auth = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`
    ).toString('base64');

    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    return response.data.access_token;
  }

  async initiateSTKPush(phoneNumber, amount, accountReference) {
    const token = await this.getAccessToken();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp =
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    // Password built from Store Number + Passkey + Timestamp
    const password = Buffer.from(
      `${this.storeNumber}${this.passkey}${timestamp}`
    ).toString('base64');

    let phone = String(phoneNumber).replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;

    const body = {
      BusinessShortCode: this.storeNumber,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.round(Number(amount)),
      PartyA: phone,
      PartyB: this.storeNumber,
      PhoneNumber: phone,
      CallBackURL: this.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: 'BetFusion Deposit',
    };

    console.log('📤 STK Push using Store Number:', this.storeNumber);
    console.log('📤 Till Number (display):', this.tillNumber);

    const url = `${this.baseUrl}/mpesa/stkpush/v1/processrequest`;
    const response = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  }
}

module.exports = new MpesaService();