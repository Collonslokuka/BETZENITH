// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifySecrets } = require('../config/jwt');

// ============================================================
//  JWT KEY RING VERIFIER
//  Tries current secret first, then previous secrets.
//  Returns { decoded, usedKeyIndex } or throws.
//  usedKeyIndex === 0 → token was signed with the CURRENT key
//  usedKeyIndex  >  0 → token was signed with an OLD key (still valid)
// ============================================================
function verifyTokenWithRing(token) {
  let lastError = null;

  for (let i = 0; i < verifySecrets.length; i++) {
    try {
      const decoded = jwt.verify(token, verifySecrets[i]);
      return { decoded, usedKeyIndex: i };
    } catch (err) {
      lastError = err;
      // If the token is EXPIRED, stop trying other keys
      if (err.name === 'TokenExpiredError') throw err;
      // If the token is malformed, stop trying
      if (err.name === 'JsonWebTokenError' && err.message === 'jwt malformed') {
        throw err;
      }
    }
  }

  throw lastError || new Error('Invalid token');
}

// ============================================================
//  PROTECT ROUTES — verify token and attach user
// ============================================================
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // ✅ Verify against the key ring
      const { decoded, usedKeyIndex } = verifyTokenWithRing(token);

      // Log when a user is still on an old key (helps you know when to retire it)
      if (usedKeyIndex > 0) {
        console.log(
          `🔑 User ${decoded.username} (id ${decoded.id}) authenticated with previous JWT secret (index ${usedKeyIndex})`
        );
      }

      // Get user from token (exclude sensitive fields)
      req.user = await User.findById(decoded.id).select(
        '-password -loginHistory -devices'
      );

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      // Check if user is self-excluded
      if (req.user.gamingLimits?.selfExcluded) {
        const now = new Date();
        if (req.user.gamingLimits.selfExclusionUntil > now) {
          return res.status(403).json({
            success: false,
            message: `Account is self-excluded until ${req.user.gamingLimits.selfExclusionUntil.toLocaleDateString()}`,
          });
        }
      }

      // Update last activity (don't await to not block)
      User.findByIdAndUpdate(req.user._id, { lastActive: new Date() }).exec();

      next();
    } catch (error) {
      console.error('Auth error:', error.name, error.message);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized - Invalid token',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - No token provided',
    });
  }
};

// ============================================================
//  ADMIN MIDDLEWARE
// ============================================================
const admin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === 'admin' || req.user.role === 'superadmin')
  ) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
};

// ============================================================
//  SUPER ADMIN MIDDLEWARE
// ============================================================
const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
  }
};

// ============================================================
//  OPTIONAL AUTH — attach user if token exists, never block
// ============================================================
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      // ✅ Use key ring here too
      const { decoded } = verifyTokenWithRing(token);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Ignore token errors — this route is optional auth
    }
  }
  next();
};

// ============================================================
//  KYC LEVEL CHECK
// ============================================================
const kycLevel = (requiredLevel) => {
  return (req, res, next) => {
    if (req.user.kycLevel >= requiredLevel) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: `KYC level ${requiredLevel} required`,
      });
    }
  };
};

// ============================================================
//  OWNERSHIP CHECK
// ============================================================
const isOwner = (model) => async (req, res, next) => {
  try {
    const resource = await model.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (
      resource.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource',
      });
    }

    req.resource = resource;
    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================
//  RATE LIMIT BY USER
// ============================================================
const userRateLimit = (maxRequests, windowMs) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user._id.toString();
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    const windowStart = now - windowMs;

    // Filter out old requests
    const recentRequests = userRequests.filter((time) => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};

module.exports = {
  protect,
  admin,
  superAdmin,
  optionalAuth,
  kycLevel,
  isOwner,
  userRateLimit,
  // Expose the ring verifier so other modules can use it (e.g. socket auth)
  verifyTokenWithRing,
};