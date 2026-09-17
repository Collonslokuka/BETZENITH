// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ============================================================
    //  BASIC INFORMATION
    // ============================================================
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },

    // ============================================================
    //  PHONE — accepts 0712345678, +254712345678, 254712345678
    // ============================================================
    phoneNumber: {
      type: String,
      default: '',
      validate: {
        validator: function (v) {
          if (!v) return true; // optional
          return /^(\+?254|0)[17]\d{8}$/.test(v.replace(/\s/g, ''));
        },
        message: 'Please provide a valid Kenyan phone number (e.g., 0712345678)',
      },
    },
    country: {
      type: String,
      default: 'Kenya',
    },
    dateOfBirth: Date,

    // ============================================================
    //  EMAIL VERIFICATION (auto-verified by default)
    // ============================================================
    isVerified: {
      type: Boolean,
      default: true,
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    // ============================================================
    //  PASSWORD RESET
    // ============================================================
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ============================================================
    //  ACCOUNT / BALANCE — KES default (Kenya first)
    // ============================================================
    balance: {
      type: Number,
      default: 0, // new users start with 0, seed overrides for test users
      min: [0, 'Balance cannot be negative'],
      max: [1000000000, 'Balance exceeds maximum allowed'],
    },
    currency: {
      type: String,
      default: 'KES', // 🇰🇪 Kenya default
      enum: ['KES', 'UGX', 'MWK'],
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },

    // ============================================================
    //  KYC
    // ============================================================
    kycStatus: {
      type: String,
      enum: ['not_submitted', 'NOT_SUBMITTED', 'pending', 'PENDING', 'verified', 'APPROVED', 'rejected', 'REJECTED'],
      default: 'not_submitted',
    },
    kycLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    kycApprovedAt: Date,
    kycRejectedAt: Date,
    kycRejectionReason: String,

    // ============================================================
    //  ACCOUNT STATUS
    // ============================================================
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    lastActive: Date,
    loginCount: {
      type: Number,
      default: 0,
    },

    // ============================================================
    //  NOTIFICATION SETTINGS (used by users.js)
    // ============================================================
    notificationSettings: {
      email: {
        bets: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
        security: { type: Boolean, default: true },
      },
      push: {
        bets: { type: Boolean, default: true },
        live: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
      },
      sms: {
        bets: { type: Boolean, default: false },
        promotions: { type: Boolean, default: false },
        security: { type: Boolean, default: true },
      },
    },

    // ============================================================
    //  RESPONSIBLE GAMING LIMITS
    // ============================================================
    gamingLimits: {
      depositLimit: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 },
        period: { type: String, enum: ['day', 'week', 'month'], default: 'day' },
        resetDate: Date,
      },
      lossLimit: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 },
        period: { type: String, enum: ['day', 'week', 'month'], default: 'day' },
        resetDate: Date,
      },
      betLimit: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 },
        period: { type: String, enum: ['day', 'week', 'month'], default: 'day' },
        resetDate: Date,
      },
      sessionLimit: {
        enabled: { type: Boolean, default: false },
        minutes: { type: Number, default: 0 },
      },
      selfExcluded: { type: Boolean, default: false },
      selfExclusionUntil: Date,
      excludedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
//  PRE-SAVE HOOKS
// ============================================================

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamps
userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ============================================================
//  VIRTUALS
// ============================================================

/**
 * Whether the user is currently self-excluded
 */
userSchema.virtual('isSelfExcluded').get(function () {
  if (!this.gamingLimits?.selfExcluded) return false;
  if (!this.gamingLimits?.selfExclusionUntil) return true;
  return this.gamingLimits.selfExclusionUntil > new Date();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// ============================================================
//  METHODS
// ============================================================

/**
 * Compare plaintext password to hashed
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate JWT token
 */
userSchema.methods.generateAuthToken = function () {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
      username: this.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Generate email verification token (kept for backward compatibility)
 */
userSchema.methods.generateVerificationToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

/**
 * Whether email is verified
 */
userSchema.methods.isEmailVerified = function () {
  return this.isVerified === true;
};

/**
 * Generate password reset token
 */
userSchema.methods.generateResetToken = function () {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  return token;
};

/**
 * Check if user can place a bet of the given stake
 * Returns { allowed: true } or { allowed: false, reason: '...' }
 */
userSchema.methods.canBet = function (stake) {
  const stakeAmount = Number(stake);

  // Invalid stake
  if (!stakeAmount || isNaN(stakeAmount) || stakeAmount <= 0) {
    return { allowed: false, reason: 'Invalid stake amount' };
  }

  // Account deactivated
  if (!this.isActive) {
    return { allowed: false, reason: 'Account is deactivated' };
  }

  // Self-excluded
  if (this.isSelfExcluded) {
    const until = this.gamingLimits?.selfExclusionUntil;
    const untilStr = until ? new Date(until).toLocaleDateString() : 'forever';
    return {
      allowed: false,
      reason: `Account is self-excluded until ${untilStr}`,
    };
  }

  // Insufficient balance
  if (stakeAmount > this.balance) {
    return {
      allowed: false,
      reason: `Insufficient balance. You have KSh ${this.balance.toLocaleString()}, tried to stake KSh ${stakeAmount.toLocaleString()}`,
    };
  }

  // Per-bet limit
  const betLimit = this.gamingLimits?.betLimit;
  if (betLimit?.enabled && betLimit.amount > 0) {
    if (stakeAmount > betLimit.amount) {
      return {
        allowed: false,
        reason: `Stake exceeds your single-bet limit of KSh ${betLimit.amount.toLocaleString()}`,
      };
    }
  }

  // Absolute platform minimum
  if (stakeAmount < 1) {
    return { allowed: false, reason: 'Minimum stake is KSh 1' };
  }

  return { allowed: true };
};

/**
 * Check if a deposit of the given amount is allowed
 * Returns { allowed: true } or { allowed: false, reason: '...' }
 */
userSchema.methods.canDeposit = function (amount) {
  const amt = Number(amount);

  if (!amt || amt <= 0) {
    return { allowed: false, reason: 'Invalid deposit amount' };
  }

  if (this.isSelfExcluded) {
    return {
      allowed: false,
      reason: 'Cannot deposit while self-excluded',
    };
  }

  const limit = this.gamingLimits?.depositLimit;
  if (limit?.enabled && limit.amount > 0) {
    // Would need transaction history to enforce properly; simplified here
    if (amt > limit.amount) {
      return {
        allowed: false,
        reason: `Deposit exceeds your ${limit.period} limit of KSh ${limit.amount.toLocaleString()}`,
      };
    }
  }

  return { allowed: true };
};

/**
 * Add winnings to balance (atomic-ish)
 */
userSchema.methods.addWinnings = async function (amount) {
  const amt = Number(amount);
  if (amt <= 0) return this.balance;
  this.balance = Number((this.balance + amt).toFixed(2));
  await this.save();
  return this.balance;
};

/**
 * Deduct stake from balance
 */
userSchema.methods.deductStake = async function (amount) {
  const amt = Number(amount);
  if (amt <= 0) throw new Error('Invalid stake amount');
  if (amt > this.balance) throw new Error('Insufficient balance');
  this.balance = Number((this.balance - amt).toFixed(2));
  await this.save();
  return this.balance;
};

/**
 * Remove sensitive info when serializing to JSON
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.verificationTokenExpires;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.loginHistory;
  delete user.devices;
  return user;
};

module.exports = mongoose.model('User', userSchema);