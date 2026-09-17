// server/config/jwt.js
/**
 * JWT Key Ring Manager
 *
 * Holds a list of secrets:
 *   [0] = CURRENT — used to SIGN new tokens
 *   [1..n] = PREVIOUS — used ONLY to VERIFY old tokens during grace period
 *
 * Rotation process:
 *   1. Generate new secret
 *   2. Move current → previous list
 *   3. Set new secret as JWT_SECRET
 *   4. Redeploy
 *   5. After JWT_EXPIRE has passed, drop old secret from previous list
 */
require('dotenv').config();

const CURRENT_SECRET = process.env.JWT_SECRET;

if (!CURRENT_SECRET) {
  throw new Error('❌ JWT_SECRET is not set in environment. Server cannot start.');
}

if (CURRENT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET is shorter than 32 characters — please rotate to a stronger secret');
}

// Parse comma-separated previous secrets, filtered for empties
const PREVIOUS_SECRETS = (process.env.JWT_SECRETS_PREVIOUS || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// Compute grace period in days from JWT_EXPIRE (default 30 days)
function parseExpiryDays(expiry) {
  const match = String(expiry).match(/^(\d+)([dhms])$/);
  if (!match) return 30;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  const multipliers = { d: 1, h: 1 / 24, m: 1 / 1440, s: 1 / 86400 };
  return Math.ceil(n * (multipliers[unit] || 1));
}

const JWT_GRACE_PERIOD_DAYS = parseExpiryDays(JWT_EXPIRE);

// Full verification ring — current FIRST, then previous
const VERIFY_RING = [CURRENT_SECRET, ...PREVIOUS_SECRETS];

console.log('🔐 JWT Key Ring initialized:');
console.log(`   - Current secret:    ${CURRENT_SECRET.substring(0, 8)}... (${CURRENT_SECRET.length} chars)`);
console.log(`   - Previous secrets:  ${PREVIOUS_SECRETS.length}`);
console.log(`   - Token expiry:      ${JWT_EXPIRE}`);
console.log(`   - Rotation grace:    ${JWT_GRACE_PERIOD_DAYS} days`);

module.exports = {
  /** Used to SIGN new tokens */
  signSecret: CURRENT_SECRET,
  /** Used to VERIFY incoming tokens (current first, then previous) */
  verifySecrets: VERIFY_RING,
  /** Human-readable status for admin endpoints */
  status: {
    currentSecretPrefix: CURRENT_SECRET.substring(0, 8) + '...',
    currentSecretLength: CURRENT_SECRET.length,
    previousSecretCount: PREVIOUS_SECRETS.length,
    totalVerificationKeys: VERIFY_RING.length,
    expiresIn: JWT_EXPIRE,
    gracePeriodDays: JWT_GRACE_PERIOD_DAYS,
    lastRotation: process.env.JWT_LAST_ROTATION || 'unknown',
  },
  jwtExpire: JWT_EXPIRE,
};