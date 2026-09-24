// server/utils/emailService.js
const nodemailer = require('nodemailer');

// Create transporter
// NOTE: family: 4 forces IPv4 — Render free tier has no outbound IPv6,
// so the default IPv6 resolution for smtp.gmail.com fails with ENETUNREACH.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  family: 4,
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Send verification email
exports.sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"BETZENITH" <${process.env.EMAIL_FROM || 'noreply@betzenith.app'}>`,
    to: email,
    subject: 'Verify Your Email - BETZENITH',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #0a0c14;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: linear-gradient(135deg, #1a1f2e 0%, #0f1219 100%);
            border: 2px solid #2a3042;
            border-radius: 16px;
            padding: 40px 30px;
            color: #ffffff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 32px;
            margin: 0;
            color: #ffffff;
          }
          .header span {
            color: #2e7d32;
          }
          .button {
            display: inline-block;
            background-color: #2e7d32;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 40px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #2a3042;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BET<span>ZENITH</span></h1>
          </div>
          <div class="content">
            <h2>Welcome to BETZENITH! 🎉</h2>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">VERIFY EMAIL</a>
            <p style="word-break: break-all; font-size: 12px; color: #9ca3af;">${verificationUrl}</p>
          </div>
          <div class="footer">
            <p>© 2026 BETZENITH. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    throw error;
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"BETZENITH" <${process.env.EMAIL_FROM || 'noreply@betzenith.app'}>`,
    to: email,
    subject: 'Reset Your Password - BETZENITH',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #0a0c14;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: linear-gradient(135deg, #1a1f2e 0%, #0f1219 100%);
            border: 2px solid #2a3042;
            border-radius: 16px;
            padding: 40px 30px;
            color: #ffffff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 32px;
            margin: 0;
            color: #ffffff;
          }
          .header span {
            color: #2e7d32;
          }
          .button {
            display: inline-block;
            background-color: #2e7d32;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 40px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #2a3042;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>BET<span>ZENITH</span></h1>
          </div>
          <div class="content">
            <h2>Reset Your Password 🔐</h2>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">RESET PASSWORD</a>
            <p style="word-break: break-all; font-size: 12px; color: #9ca3af;">${resetUrl}</p>
            <p style="color: #9ca3af; font-size: 14px;">This link will expire in 1 hour.</p>
          </div>
          <div class="footer">
            <p>© 2026 BETZENITH. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    throw error;
  }
};

// Test email configuration
exports.testEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration is invalid:', error.message);
    return false;
  }
};