// server/scripts/rotate-jwt.js
/**
 * Generate a fresh JWT secret and print the exact env changes needed.
 *
 * Usage:
 *   node scripts/rotate-jwt.js
 *
 * Then copy/paste the output into your .env (or Render dashboard),
 * and redeploy.
 */
const crypto = require('crypto');
require('dotenv').config();

const newSecret = crypto.randomBytes(64).toString('hex');
const currentSecret = process.env.JWT_SECRET || '';
const previousSecrets = process.env.JWT_SECRETS_PREVIOUS || '';

// Move current → previous list (dedupe, cap at 3 previous secrets)
const previousList = previousSecrets
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (currentSecret && !previousList.includes(currentSecret)) {
  previousList.unshift(currentSecret);
}

// Keep only the 3 most recent previous secrets
const trimmedPrevious = previousList.slice(0, 3);

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  🔐 JWT SECRET ROTATION');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('  Copy these lines into your .env (or Render env vars):');
console.log('');
console.log(`  JWT_SECRET=${newSecret}`);
console.log(`  JWT_SECRETS_PREVIOUS=${trimmedPrevious.join(',')}`);
console.log(`  JWT_LAST_ROTATION=${new Date().toISOString().split('T')[0]}`);
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  📋 NEXT STEPS');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('  1. Paste the 3 lines above into your .env');
console.log('  2. Redeploy your server');
console.log('  3. Wait 30 days (>= JWT_EXPIRE)');
console.log('  4. Remove old secrets from JWT_SECRETS_PREVIOUS');
console.log('  5. Redeploy again to fully retire the old key');
console.log('');
console.log('  ⚠️  DO NOT paste JWT_SECRET into git, chat, or docs.');
console.log('');