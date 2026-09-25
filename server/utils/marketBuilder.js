// server/utils/marketBuilder.js
// ─── Single source of truth for every match's market board ───
// Used by adminPanel, aiMatchService, and FixturesCoordinator so that
// admin-created, system-generated, and API-imported matches all have the
// same complete catalog. Soccer gets the full ~90-market board; other
// sports get sport-appropriate catalogs using the same API.

const TOTAL_LINES = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];

function toOdds(p) {
  return Math.max(1.01, +(1 / Math.max(p, 0.001)).toFixed(2));
}

function poissonOver(lambda, line) {
  let p = Math.exp(-lambda);
  let sum = p;
  const n = Math.ceil(line + 0.5);
  for (let k = 1; k < n; k++) {
    p = (p * lambda) / k;
    sum += p;
  }
  return Math.max(0.01, Math.min(0.99, 1 - sum));
}

function norm1X2(odds = {}) {
  const h = Number(odds.home) || +(1.35 + Math.random() * 2.6).toFixed(2);
  const d = Number(odds.draw) || +(2.9 + Math.random() * 1.4).toFixed(2);
  const a = Number(odds.away) || +(1.35 + Math.random() * 2.6).toFixed(2);
  return { home: h, draw: d, away: a };
}

// ─── SOCCER ───────────────────────────────────────────────────
function buildSoccerMarkets(odds = {}) {
  const { home: H, draw: D, away: A } = norm1X2(odds);

  const invH = 1 / H, invD = 1 / D, invA = 1 / A;
  const tot = invH + invD + invA;
  const pH = invH / tot, pD = invD / tot, pA = invA / tot;

  const markets = [];
  const push = (name, val) => markets.push({ name, odds: val, isActive: true });

  // 1X2
  push('1', +H.toFixed(2));
  push('X', +D.toFixed(2));
  push('2', +A.toFixed(2));

  // 1st Goal
  const LAMBDA = 2.7;
  const LAMBDA_1H = LAMBDA * 0.45;
  const pNoGoal = Math.exp(-LAMBDA);
  const pFirstHome = (1 - pNoGoal) * (pH > pA ? 0.58 : 0.42);
  const pFirstAway = Math.max(0.01, 1 - pNoGoal - pFirstHome);
  push('1st Goal 1', toOdds(pFirstHome));
  push('1st Goal 2', toOdds(pFirstAway));
  push('1st Goal None', toOdds(pNoGoal));

  // Double Chance
  push('Double Chance 1X', toOdds(pH + pD));
  push('Double Chance 12', toOdds(pH + pA));
  push('Double Chance X2', toOdds(pD + pA));

  // Draw No Bet
  const pDnb1 = pH / (pH + pA);
  push('DNB 1', toOdds(pDnb1));
  push('DNB 2', toOdds(1 - pDnb1));

  // Totals
  TOTAL_LINES.forEach(line => {
    const pOver = poissonOver(LAMBDA, line);
    push(`Over ${line}`, toOdds(pOver));
    push(`Under ${line}`, toOdds(1 - pOver));
  });

  // BTTS
  const pBtts = Math.min(0.75, 0.55 + 0.10 * (1 - Math.abs(pH - pA)));
  push('BTTS', toOdds(pBtts));
  push('BTTS No', toOdds(1 - pBtts));

  // 1X2 & BTTS
  push('1 & BTTS', toOdds(pH * pBtts * 0.75));
  push('1 & BTTS No', toOdds(pH * (1 - pBtts) * 1.25));
  push('X & BTTS', toOdds(pD * pBtts * 1.10));
  push('X & BTTS No', toOdds(pD * (1 - pBtts) * 1.10));
  push('2 & BTTS', toOdds(pA * pBtts * 0.75));
  push('2 & BTTS No', toOdds(pA * (1 - pBtts) * 1.25));

  // 1X2 & Total 2.5
  const pOver25 = poissonOver(LAMBDA, 2.5);
  const pUnder25 = 1 - pOver25;
  push('1 & Over 2.5', toOdds(pH * pOver25 * 1.25));
  push('1 & Under 2.5', toOdds(pH * pUnder25 * 1.55));
  push('X & Over 2.5', toOdds(pD * pOver25 * 1.55));
  push('X & Under 2.5', toOdds(pD * pUnder25 * 1.40));
  push('2 & Over 2.5', toOdds(pA * pOver25 * 1.25));
  push('2 & Under 2.5', toOdds(pA * pUnder25 * 1.55));

  // Correct Score
  const csBase = {
    '0:0': 0.11, '0:1': 0.07, '0:2': 0.025, '0:3': 0.006, '0:4': 0.0015,
    '1:0': 0.15, '1:1': 0.13, '1:2': 0.05,  '1:3': 0.012, '1:4': 0.0025,
    '2:0': 0.09, '2:1': 0.11, '2:2': 0.06,  '2:3': 0.018, '2:4': 0.004,
    '3:0': 0.04, '3:1': 0.05, '3:2': 0.03,  '3:3': 0.012, '3:4': 0.003,
    '4:0': 0.015,'4:1': 0.02, '4:2': 0.015, '4:3': 0.006, '4:4': 0.0015,
  };
  const hTilt = 1 + (pH - 0.33) * 1.2;
  const aTilt = 1 + (pA - 0.33) * 1.2;
  Object.entries(csBase).forEach(([name, p]) => {
    const [h, a] = name.split(':').map(Number);
    let adj = 1;
    if (h > a) adj = hTilt;
    else if (a > h) adj = aTilt;
    push(name, toOdds(Math.min(0.6, p * adj)));
  });
  push('Other', toOdds(0.04));

  // Halftime / Fulltime
  const pH1 = Math.min(0.95, Math.sqrt(pH) * 0.6 + pH * 0.4);
  const pD1 = 0.34;
  const pA1 = Math.max(0.02, 1 - pH1 - pD1);
  [
    ['1','1', pH1 * pH * 1.55], ['1','X', pH1 * pD * 4.0], ['1','2', pH1 * pA * 8.0],
    ['X','1', pD1 * pH * 5.0 ], ['X','X', pD1 * pD * 2.2], ['X','2', pD1 * pA * 5.0],
    ['2','1', pA1 * pH * 8.0 ], ['2','X', pA1 * pD * 4.0], ['2','2', pA1 * pA * 1.55],
  ].forEach(([ht, ft, p]) => push(`${ht}/${ft}`, toOdds(p)));

  // 1st Half - 1X2
  push('1H 1', toOdds(pH1));
  push('1H X', toOdds(pD1));
  push('1H 2', toOdds(pA1));

  // 1st Half - Totals
  [0.5, 1.5, 2.5].forEach(line => {
    const pOver = poissonOver(LAMBDA_1H, line);
    push(`1H Over ${line}`, toOdds(pOver));
    push(`1H Under ${line}`, toOdds(1 - pOver));
  });

  // 1st Half - BTTS
  const pBtts1H = pBtts * 0.35;
  push('1H BTTS', toOdds(pBtts1H));
  push('1H BTTS No', toOdds(1 - pBtts1H));

  // 1st Half - Correct Score
  const cs1H = {
    '0:0': 0.35, '0:1': 0.12, '0:2': 0.03,
    '1:0': 0.20, '1:1': 0.10, '1:2': 0.03,
    '2:0': 0.05, '2:1': 0.04, '2:2': 0.02,
  };
  Object.entries(cs1H).forEach(([name, p]) => push(`1H ${name}`, toOdds(p)));
  push('1H Other', toOdds(0.06));

  return markets;
}

// ─── OTHER SPORTS ─────────────────────────────────────────────
function buildBasketballMarkets(odds = {}) {
  const h = Number(odds.home) || +(1.20 + Math.random() * 2.0).toFixed(2);
  const a = Number(odds.away) || +(1.20 + Math.random() * 2.0).toFixed(2);
  return [
    { name: 'Home', odds: +h.toFixed(2), isActive: true },
    { name: 'Away', odds: +a.toFixed(2), isActive: true },
    { name: 'Over 210.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
    { name: 'Under 210.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
    { name: 'Over 220.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
    { name: 'Under 220.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
  ];
}

function buildTennisMarkets(odds = {}) {
  const h = Number(odds.home) || +(1.20 + Math.random() * 2.2).toFixed(2);
  const a = Number(odds.away) || +(1.20 + Math.random() * 2.2).toFixed(2);
  return [
    { name: 'Home', odds: +h.toFixed(2), isActive: true },
    { name: 'Away', odds: +a.toFixed(2), isActive: true },
    { name: 'Straight Sets', odds: +(1.80 + Math.random() * 0.8).toFixed(2), isActive: true },
  ];
}

function buildAmericanFootballMarkets(odds = {}) {
  const h = Number(odds.home) || +(1.30 + Math.random() * 1.8).toFixed(2);
  const a = Number(odds.away) || +(1.30 + Math.random() * 1.8).toFixed(2);
  return [
    { name: 'Home', odds: +h.toFixed(2), isActive: true },
    { name: 'Away', odds: +a.toFixed(2), isActive: true },
    { name: 'Over 45.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
    { name: 'Under 45.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
  ];
}

function buildBaseballMarkets(odds = {}) {
  const h = Number(odds.home) || +(1.50 + Math.random() * 1.5).toFixed(2);
  const a = Number(odds.away) || +(1.50 + Math.random() * 1.5).toFixed(2);
  return [
    { name: 'Home', odds: +h.toFixed(2), isActive: true },
    { name: 'Away', odds: +a.toFixed(2), isActive: true },
    { name: 'Over 8.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
    { name: 'Under 8.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
  ];
}

function buildIceHockeyMarkets(odds = {}) {
  const h = Number(odds.home) || +(1.50 + Math.random() * 1.5).toFixed(2);
  const a = Number(odds.away) || +(1.50 + Math.random() * 1.5).toFixed(2);
  return [
    { name: 'Home', odds: +h.toFixed(2), isActive: true },
    { name: 'Away', odds: +a.toFixed(2), isActive: true },
    { name: 'Over 5.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
    { name: 'Under 5.5', odds: +(1.85 + Math.random() * 0.2).toFixed(2), isActive: true },
  ];
}

function buildSimpleMarkets(odds = {}) {
  const h = Number(odds.home) || +(1.30 + Math.random() * 2.0).toFixed(2);
  const a = Number(odds.away) || +(1.30 + Math.random() * 2.0).toFixed(2);
  return [
    { name: 'Home', odds: +h.toFixed(2), isActive: true },
    { name: 'Away', odds: +a.toFixed(2), isActive: true },
  ];
}

function buildMarkets(sport, odds = {}) {
  switch ((sport || 'soccer').toLowerCase()) {
    case 'soccer':            return buildSoccerMarkets(odds);
    case 'basketball':        return buildBasketballMarkets(odds);
    case 'tennis':            return buildTennisMarkets(odds);
    case 'american-football': return buildAmericanFootballMarkets(odds);
    case 'baseball':          return buildBaseballMarkets(odds);
    case 'ice-hockey':        return buildIceHockeyMarkets(odds);
    case 'cricket':
    case 'mma':               return buildSimpleMarkets(odds);
    default:                  return buildSoccerMarkets(odds);
  }
}

module.exports = { buildMarkets };