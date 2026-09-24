// server/models/Match.js
const mongoose = require('mongoose');

// ============================================================
//  BETTING CLOSURE CONFIGURATION
// ============================================================
const BETTING_CLOSE_MINUTES = {
  soccer: 85,
  basketball: 45,
  football: 55,
  baseball: 8,
  hockey: 55,
  tennis: 4,
  mma: 4,
  boxing: 11,
  golf: 3,
  cricket: 18,
  rugby: 75,
  f1: 50,
  esports: 4,
};

const CLOSED_STATUSES = [
  'FINISHED',
  'CANCELLED',
  'POSTPONED',
  'ABANDONED',
  'SUSPENDED',
];

// ============================================================
//  SUB-SCHEMAS
// ============================================================
const marketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: [
      // 1X2 (soccer)
      '1', 'X', '2',

      // Moneyline (basketball, tennis, hockey, NFL, baseball, MMA, cricket)
      'Home', 'Away',

      // Totals (all sports)
      'Over 0.5', 'Over 1.5', 'Over 2.5', 'Under 2.5',
      'Over 8.5', 'Under 8.5',
      'Over 5.5', 'Under 5.5',
      'Over 45.5', 'Under 45.5',
      'Over 210.5', 'Under 210.5',
      'Over 220.5', 'Under 220.5',

      // Both teams to score (soccer)
      'BTTS', 'BTTS No',

      // Double chance (soccer)
      'Double Chance 1X', 'Double Chance 12', 'Double Chance X2',

      // Tennis
      'Straight Sets',

      // Combination markets (NEW)
      '1 & Over 2.5', '1 & Under 2.5',
      'X & Over 2.5', 'X & Under 2.5',
      '2 & Over 2.5', '2 & Under 2.5',

      // Correct Score (NEW)
      '0:0', '0:1', '0:2', '0:3', '0:4',
      '1:0', '1:1', '1:2', '1:3', '1:4',
      '2:0', '2:1', '2:2', '2:3', '2:4',
      '3:0', '3:1', '3:2', '3:3', '3:4',
      '4:0', '4:1', '4:2', '4:3', '4:4',
    ],
  },
  odds: {
    type: Number,
    required: true,
    min: 1.01,
    max: 1000,
  },
  previousOdds: Number,
  oddsHistory: [
    {
      odds: Number,
      timestamp: { type: Date, default: Date.now },
      reason: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  volume: {
    type: Number,
    default: 0,
  },
  betsCount: {
    type: Number,
    default: 0,
  },
  minBet: {
    type: Number,
    default: 10,
  },
  maxBet: {
    type: Number,
    default: 1000000,
  },
  suspended: {
    type: Boolean,
    default: false,
  },
  handicap: Number,
  total: Number,
});

const liveStatsSchema = new mongoose.Schema({
  possession: { home: Number, away: Number },
  shots: { home: Number, away: Number },
  shotsOnTarget: { home: Number, away: Number },
  corners: { home: Number, away: Number },
  fouls: { home: Number, away: Number },
  yellowCards: { home: Number, away: Number },
  redCards: { home: Number, away: Number },
  offsides: { home: Number, away: Number },
  injuries: { home: Number, away: Number },
  substitutions: { home: Number, away: Number },
  updatedAt: Date,
});

// ============================================================
//  MAIN MATCH SCHEMA
// ============================================================
const matchSchema = new mongoose.Schema(
  {
    // League Information
    league: { type: String, required: true, index: true },
    leagueId: { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
    season: String,
    round: String,
    sport: { type: String, default: 'soccer', index: true },

    // Team Information
    homeTeam: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      name: { type: String, required: true },
      abbreviation: { type: String, required: true },
      logo: String,
      form: [String],
      standing: Number,
      coach: String,
    },
    awayTeam: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      name: { type: String, required: true },
      abbreviation: { type: String, required: true },
      logo: String,
      form: [String],
      standing: Number,
      coach: String,
    },

    // Match Details
    date: { type: Date, required: true, index: true },
    time: String,
    venue: String,
    startsAt: { type: Date, index: true },
    matchDuration: { type: Number, default: 90 },

    // Score & Status
    score: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: [
        'SCHEDULED',
        'LIVE',
        'FIRST_HALF',
        'HALFTIME',
        'SECOND_HALF',
        'EXTRA_TIME',
        'PENALTIES',
        'FINISHED',
        'CANCELLED',
        'POSTPONED',
        'ABANDONED',
        'SUSPENDED',
      ],
      default: 'SCHEDULED',
      index: true,
    },
    minute: { type: Number, default: 0 },
    addedTime: Number,

    // Events
    events: [
      {
        type: {
          type: String,
          enum: ['GOAL', 'PENALTY', 'RED_CARD', 'YELLOW_CARD', 'SUBSTITUTION', 'INJURY', 'VAR'],
        },
        minute: Number,
        addedTime: Number,
        team: String,
        player: String,
        playerId: { type: mongoose.Schema.Types.ObjectId },
        assistedBy: String,
        homeScore: Number,
        awayScore: Number,
        reason: String,
      },
    ],

    // Markets
    markets: [marketSchema],

    // Live Stats
    liveStats: liveStatsSchema,

    // Betting Information
    cashoutEnabled: { type: Boolean, default: true },
    liveBettingEnabled: { type: Boolean, default: true },

    // Streaming
    streamingUrl: String,
    hasLiveStream: { type: Boolean, default: false },
    streamProviders: [String],

    // Statistics
    views: { type: Number, default: 0 },
    betCount: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },

    // Result (for settled matches)
    result: {
      winner: { type: String, enum: ['HOME', 'AWAY', 'DRAW'] },
      isSettled: { type: Boolean, default: false },
      settledAt: Date,
      settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // Metadata
    externalId: String,
    source: String,
    scriptedOutcome: {
      homeScore: { type: Number, default: null },
      awayScore: { type: Number, default: null },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ============================================================
//  INDEXES
// ============================================================
matchSchema.index({ date: 1, status: 1 });
matchSchema.index({ 'homeTeam.name': 'text', 'awayTeam.name': 'text', league: 'text' });
matchSchema.index({ status: 1, date: 1 });
matchSchema.index({ league: 1, status: 1 });
matchSchema.index({ status: 1, startsAt: 1 });

// ============================================================
//  PRE-SAVE HOOKS
// ============================================================
matchSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  if (this.isModified('status')) {
    if (!this.statusTimeline) this.statusTimeline = [];
    this.statusTimeline.push({
      status: this.status,
      timestamp: new Date(),
    });
  }

  next();
});

// ============================================================
//  BETTING CLOSURE LOGIC
// ============================================================

matchSchema.methods.isBettingAvailable = function () {
  if (CLOSED_STATUSES.includes(this.status)) return false;
  if (this.status === 'LIVE' && !this.liveBettingEnabled) return false;

  const sport = (this.sport || 'soccer').toLowerCase();
  const cutoff = BETTING_CLOSE_MINUTES[sport] ?? 85;
  const minute = this.minute || 0;

  if (
    ['SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(this.status) &&
    minute >= cutoff
  ) {
    return false;
  }

  const maxDuration = this.matchDuration || 90;
  if (
    ['LIVE', 'SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(this.status) &&
    minute >= maxDuration
  ) {
    return false;
  }

  return true;
};

matchSchema.methods.getBettingClosedReason = function () {
  if (this.isBettingAvailable()) return null;

  if (CLOSED_STATUSES.includes(this.status)) {
    return `Match is ${this.status.toLowerCase()}`;
  }

  const sport = (this.sport || 'soccer').toLowerCase();
  const cutoff = BETTING_CLOSE_MINUTES[sport] ?? 85;

  if (
    ['SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'].includes(this.status) &&
    (this.minute || 0) >= cutoff
  ) {
    return `Betting closed — match is in its final stages (${this.minute}')`;
  }

  return 'Betting is not available';
};

matchSchema.virtual('bettingOpen').get(function () {
  return this.isBettingAvailable();
});

matchSchema.set('toJSON', { virtuals: true });
matchSchema.set('toObject', { virtuals: true });

// ============================================================
//  METHODS
// ============================================================

matchSchema.methods.updateOdds = async function (marketIndex, newOdds, reason = 'admin') {
  if (this.status === 'FINISHED') {
    throw new Error('Cannot update odds for finished match');
  }

  const market = this.markets[marketIndex];
  if (!market) throw new Error('Market not found');

  if (!market.oddsHistory) market.oddsHistory = [];
  market.oddsHistory.push({
    odds: market.odds,
    timestamp: new Date(),
    reason,
  });

  market.previousOdds = market.odds;
  market.odds = newOdds;

  await this.save();
  return market;
};

matchSchema.methods.addEvent = async function (eventData) {
  if (!this.events) this.events = [];

  if (eventData.type === 'GOAL') {
    if (eventData.team === 'home') {
      this.score.home += 1;
      eventData.homeScore = this.score.home;
      eventData.awayScore = this.score.away;
    } else {
      this.score.away += 1;
      eventData.homeScore = this.score.home;
      eventData.awayScore = this.score.away;
    }
  }

  this.events.push(eventData);
  await this.save();
  return eventData;
};

matchSchema.methods.updateLiveStats = async function (stats) {
  if (!this.liveStats) this.liveStats = {};
  Object.assign(this.liveStats, stats);
  this.liveStats.updatedAt = new Date();
  await this.save();
  return this.liveStats;
};

matchSchema.methods.getAvailableMarkets = function () {
  return this.markets.filter((m) => m.isActive && !m.suspended);
};

matchSchema.virtual('volumeByMarket').get(function () {
  const volumes = {};
  this.markets.forEach((market) => {
    volumes[market.name] = market.volume;
  });
  return volumes;
});

module.exports = mongoose.model('Match', matchSchema);