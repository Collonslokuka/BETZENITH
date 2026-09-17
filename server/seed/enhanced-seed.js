// server/seed/enhanced-seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const Transaction = require('../models/Transaction');
const {
  generateAllMatches,
  generateScheduledMatchesOnly,
} = require('../data/enhancedMatches');
require('dotenv').config();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Match.deleteMany({});
    await Bet.deleteMany({});
    await Transaction.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // ============ CREATE USERS ============

    // Super Admin
    const superAdmin = await User.create({
      username: 'superadmin',
      email: 'superadmin@betfusion.com',
      password: 'SuperAdmin123!',
      role: 'superadmin',
      balance: 1000000,
      kycStatus: 'verified',
      kycLevel: 3,
      isVerified: true,
      phoneNumber: '+254700000001',
      country: 'Kenya',
    });
    console.log('👑 Super Admin created:', superAdmin.email);

    // Admin
    const admin = await User.create({
      username: 'admin',
      email: 'admin@betfusion.com',
      password: 'Admin123!',
      role: 'admin',
      balance: 500000,
      kycStatus: 'verified',
      kycLevel: 3,
      isVerified: true,
      phoneNumber: '+254700000002',
      country: 'Kenya',
    });
    console.log('👤 Admin created:', admin.email);

    // Test User
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@betfusion.com',
      password: 'Test123!',
      balance: 5000,
      kycStatus: 'verified',
      kycLevel: 1,
      phoneNumber: '+254700000003',
      country: 'Kenya',
      notificationSettings: {
        email: { bets: true, promotions: true, security: true },
        push: { bets: true, live: true, promotions: false },
      },
    });
    console.log('👤 Test user created:', testUser.email);

    // ============ CREATE MATCHES ============

    // Live + finished + some scheduled from main generator
    const allMatches = generateAllMatches();

    // Extra pure scheduled matches for pre-match betting
    const scheduledMatches = generateScheduledMatchesOnly(15);

    // Merge
    const matches = [...allMatches, ...scheduledMatches];
    await Match.insertMany(matches);
    console.log(`✅ Seeded ${matches.length} matches (${scheduledMatches.length} pre-match)`);

    // ============ CREATE SAMPLE BETS ============
    const finishedMatches = matches.filter((m) => m.isFinished);
    const scheduledForBets = matches.filter((m) => m.status === 'SCHEDULED');

    // Winning bets
    for (let i = 0; i < 5 && i < finishedMatches.length; i++) {
      const match = finishedMatches[i];
      const stake = randomInt(100, 1000);
      const odds = match.odds.home;
      const potentialWin = stake * odds;

      const bet = await Bet.create({
        user: testUser._id,
        type: 'SINGLE',
        selections: [
          {
            match: match._id,
            marketIndex: 0,
            marketName: '1',
            odds,
            status: 'WON',
          },
        ],
        totalOdds: odds,
        stake,
        potentialWin,
        status: 'WON',
        winnings: potentialWin,
        createdAt: new Date(Date.now() - randomInt(1, 10) * 24 * 60 * 60 * 1000),
      });

      await Transaction.create({
        user: testUser._id,
        type: 'BET_WON',
        amount: potentialWin,
        bet: bet._id,
        status: 'COMPLETED',
        description: `Bet won: ${match.homeTeam.name} vs ${match.awayTeam.name}`,
      });
    }

    // Losing bets
    for (let i = 5; i < 10 && i < finishedMatches.length; i++) {
      const match = finishedMatches[i];
      const stake = randomInt(100, 1000);
      const odds = match.odds.draw || 3.4;

      await Bet.create({
        user: testUser._id,
        type: 'SINGLE',
        selections: [
          {
            match: match._id,
            marketIndex: 1,
            marketName: 'X',
            odds,
            status: 'LOST',
          },
        ],
        totalOdds: odds,
        stake,
        potentialWin: stake * odds,
        status: 'LOST',
        createdAt: new Date(Date.now() - randomInt(1, 10) * 24 * 60 * 60 * 1000),
      });
    }

    // Pending bets on scheduled matches
    for (let i = 0; i < 3 && i < scheduledForBets.length; i++) {
      const match = scheduledForBets[i];
      const marketIndex = randomInt(0, 2);
      const marketName = marketIndex === 0 ? '1' : marketIndex === 1 ? 'X' : '2';
      const stake = randomInt(200, 800);
      const odds =
        marketIndex === 0
          ? match.odds.home
          : marketIndex === 1
          ? match.odds.draw || 3.4
          : match.odds.away;

      await Bet.create({
        user: testUser._id,
        type: 'SINGLE',
        selections: [
          {
            match: match._id,
            marketIndex,
            marketName,
            odds,
            status: 'PENDING',
          },
        ],
        totalOdds: odds,
        stake,
        potentialWin: stake * odds,
        status: 'PENDING',
        createdAt: new Date(),
      });
    }

    console.log('✅ Created sample bets for test user');

    // Update test user balance
    testUser.balance = 5000 - 3000 + 2000;
    await testUser.save();

    console.log('\n' + '='.repeat(50));
    console.log('✅ DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Super Admin: superadmin@betfusion.com / SuperAdmin123!');
    console.log('👤 Admin: admin@betfusion.com / Admin123!');
    console.log('👤 Test User: test@betfusion.com / Test123!\n');
    console.log('📊 STATISTICS:');
    console.log(`👥 Total Users: 3`);
    console.log(`⚽ Total Matches: ${matches.length}`);
    console.log(
      `📅 Scheduled (pre-match): ${matches.filter((m) => m.status === 'SCHEDULED').length}`
    );
    console.log(`🔴 Live: ${matches.filter((m) => !m.isFinished && m.status !== 'SCHEDULED' && m.status !== 'FINISHED').length}`);
    console.log(`🏁 Finished: ${matches.filter((m) => m.isFinished).length}`);
    console.log(`🎲 Sample Bets: ${await Bet.countDocuments({ user: testUser._id })}`);
    console.log('\n🚀 Server ready to start!');
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();