// server/services/mpesaService.js
const axios = require('axios');
const MPESA_CONFIG = require('../config/mpesa');

class MpesaService {
  constructor() {
    this.consumerKey = MPESA_CONFIG.consumerKey;
    this.consumerSecret = MPESA_CONFIG.consumerSecret;
    this.passkey = MPESA_CONFIG.passkey;
    this.shortcode = MPESA_CONFIG.shortcode;
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

    // Timestamp must be YYYYMMDDHHmmss in Nairobi time
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp =
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`
    ).toString('base64');

    // Normalize phone: strip non-digits, ensure 2547XXXXXXXX or 2541XXXXXXXX
    let phone = String(phoneNumber).replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;

    const body = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      // Till number → Buy Goods
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.round(Number(amount)),
      PartyA: phone,
      PartyB: this.shortcode,
      PhoneNumber: phone,
      CallBackURL: this.callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: 'BetFusion Deposit',
    };

    const url = `${this.baseUrl}/mpesa/stkpush/v1/processrequest`;
    const response = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  }
}

module.exports = new MpesaService();