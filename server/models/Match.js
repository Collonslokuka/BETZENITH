// server/models/Match.js
const mongoose = require('mongoose');

const BETTING_CLOSE_MINUTES = {
  soccer: 85, basketball: 45, football: 55, baseball: 8, hockey: 55,
  tennis: 4, mma: 4, boxing: 11, golf: 3, cricket: 18, rugby: 75, f1: 50, esports: 4,
};

const CLOSED_STATUSES = ['FINISHED', 'CANCELLED', 'POSTPONED', 'ABANDONED', 'SUSPENDED'];
const IN_PLAY_STATUSES = ['FIRST_HALF', 'LIVE', 'HALFTIME', 'SECOND_HALF', 'EXTRA_TIME', 'PENALTIES'];

const marketSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  odds: { type: Number, required: true, min: 1.01, max: 1000 },
  previousOdds: Number,
  oddsHistory: [
    { odds: Number, timestamp: { type: Date, default: Date.now }, reason: String },
  ],
  isActive: { type: Boolean, default: true },
  volume: { type: Number, default: 0 },
  betsCount: { type: Number, default: 0 },
  minBet: { type: Number, default: 10 },
  maxBet: { type: Number, default: 1000000 },
  suspended: { type: Boolean, default: false },
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

const matchSchema = new mongoose.Schema(
  {
    league: { type: String, required: true, index: true },
    leagueId: { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
    season: String,
    round: String,
    sport: { type: String, default: 'soccer', index: true },

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

    date: { type: Date, required: true, index: true },
    time: String,
    venue: String,
    startsAt: { type: Date, index: true },
    timezone: { type: String, default: 'Africa/Nairobi', index: true },
    matchDuration: { type: Number, default: 90 },

    score: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: [
        'SCHEDULED', 'LIVE', 'FIRST_HALF', 'HALFTIME', 'SECOND_HALF',
        'EXTRA_TIME', 'PENALTIES', 'FINISHED', 'CANCELLED',
        'POSTPONED', 'ABANDONED', 'SUSPENDED',
      ],
      default: 'SCHEDULED',
      index: true,
    },
    minute: { type: Number, default: 0 },
    addedTime: Number,

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

    markets: [marketSchema],
    liveStats: liveStatsSchema,

    cashoutEnabled: { type: Boolean, default: true },
    liveBettingEnabled: { type: Boolean, default: true },

    streamingUrl: String,
    hasLiveStream: { type: Boolean, default: false },
    streamProviders: [String],

    views: { type: Number, default: 0 },
    betCount: { type: Number, default: 0 },
    totalVolume: { type: Number, default: 0 },

    result: {
      winner: { type: String, enum: ['HOME', 'AWAY', 'DRAW'] },
      isSettled: { type: Boolean, default: false },
      settledAt: Date,
      settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    externalId: String,
    source: String,
    scriptedOutcome: {
      homeScore: { type: Number, default: null },
      awayScore: { type: Number, default: null },
    },
    lastUpdated: Date,
    statusTimeline: [{ status: String, timestamp: Date }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

matchSchema.index({ date: 1, status: 1 });
matchSchema.index({ 'homeTeam.name': 'text', 'awayTeam.name': 'text', league: 'text' });
matchSchema.index({ status: 1, date: 1 });
matchSchema.index({ league: 1, status: 1 });
matchSchema.index({ status: 1, startsAt: 1 });

matchSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified('status')) {
    if (!this.statusTimeline) this.statusTimeline = [];
    this.statusTimeline.push({ status: this.status, timestamp: new Date() });
  }
  next();
});

matchSchema.methods.isBettingAvailable = function () {
  if (CLOSED_STATUSES.includes(this.status)) return false;
  if (this.status === 'LIVE' && !this.liveBettingEnabled) return false;

  const sport = (this.sport || 'soccer').toLowerCase();
  const cutoff = BETTING_CLOSE_MINUTES[sport] ?? 85;
  const minute = this.minute || 0;
  const maxDuration = this.matchDuration || 90;

  if (IN_PLAY_STATUSES.includes(this.status) && minute >= cutoff) return false;
  if (IN_PLAY_STATUSES.includes(this.status) && minute >= maxDuration) return false;

  return true;
};

matchSchema.methods.getBettingClosedReason = function () {
  if (this.isBettingAvailable()) return null;
  if (CLOSED_STATUSES.includes(this.status)) return `Match is ${this.status.toLowerCase()}`;

  const sport = (this.sport || 'soccer').toLowerCase();
  const cutoff = BETTING_CLOSE_MINUTES[sport] ?? 85;
  if (IN_PLAY_STATUSES.includes(this.status) && (this.minute || 0) >= cutoff) {
    return `Betting closed — match is in its final stages (${this.minute}')`;
  }
  return 'Betting is not available';
};

matchSchema.virtual('bettingOpen').get(function () { return this.isBettingAvailable(); });
matchSchema.set('toJSON', { virtuals: true });
matchSchema.set('toObject', { virtuals: true });

matchSchema.methods.updateOdds = async function (marketIndex, newOdds, reason = 'admin') {
  if (this.status === 'FINISHED') throw new Error('Cannot update odds for finished match');
  const market = this.markets[marketIndex];
  if (!market) throw new Error('Market not found');
  if (!Number.isFinite(newOdds) || newOdds < 1.01 || newOdds > 1000) {
    throw new Error('Invalid odds — must be between 1.01 and 1000');
  }

  if (!market.oddsHistory) market.oddsHistory = [];
  market.oddsHistory.push({ odds: market.odds, timestamp: new Date(), reason });
  market.previousOdds = market.odds;
  market.odds = newOdds;

  await this.save();
  return market;
};

matchSchema.methods.addEvent = async function (eventData) {
  if (!this.events) this.events = [];
  if (!this.score) this.score = { home: 0, away: 0 };
  if (eventData.type === 'GOAL') {
    if (eventData.team === 'home') this.score.home = (this.score.home || 0) + 1;
    else this.score.away = (this.score.away || 0) + 1;
    eventData.homeScore = this.score.home;
    eventData.awayScore = this.score.away;
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
  return this.markets.filter((m) => m.isActive && !m.suspended && m.odds >= 1.01);
};

matchSchema.virtual('volumeByMarket').get(function () {
  const volumes = {};
  (this.markets || []).forEach((market) => { volumes[market.name] = market.volume; });
  return volumes;
});

module.exports = mongoose.model('Match', matchSchema);