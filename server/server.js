const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// ============ CONNECT DATAFEEDSERVICE TO SOCKET.IO ============
const DataFeedService = require('./services/DataFeedService');
DataFeedService.setSocketIO(io);

// ============ SECURITY MIDDLEWARE ============
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.CLIENT_URL || 'http://localhost:5173', 'https://*.vercel.app', 'https://*.onrender.com', 'https://betzenith.app', 'https://*.betzenith.app'],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    }
  }
}));

// ✅ Trust proxy so express-rate-limit works correctly behind Render/Vercel
app.set('trust proxy', 1);

// ============ CORS - UPDATED FOR YOUR DEPLOYMENT ============
// MUST RUN BEFORE RATE LIMITER, so 429 responses still carry CORS headers
const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',

  // Your Vercel deployments (free URLs)
  'https://betfusion.vercel.app',
  'https://betzenith.vercel.app',
  'https://betzenith-client.vercel.app',
  'https://betzenith-u8ji.vercel.app',
  'https://betzenith-odux.vercel.app',
  'https://betzenith-git-main-mrmangoyes-projects.vercel.app',

  // Your custom domains
  'https://betznith.com',
  'https://www.betznith.com',
  'https://betzenith.app',
  'https://www.betzenith.app',

  // Render backend (for testing)
  'https://betfusion-api.onrender.com',

  // From environment variable (for flexibility)
  process.env.CLIENT_URL
].filter(Boolean); // Remove any undefined values

// CORS Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed (exact match):', origin);
      return callback(null, true);
    }

    // Special: Allow any vercel.app subdomain dynamically
    if (origin.endsWith('.vercel.app')) {
      console.log('✅ CORS allowed (Vercel subdomain):', origin);
      return callback(null, true);
    }

    // Special: Allow any onrender.com subdomain dynamically
    if (origin.endsWith('.onrender.com')) {
      console.log('✅ CORS allowed (Render subdomain):', origin);
      return callback(null, true);
    }

    // Special: Allow any subdomain of betzenith.app dynamically
    if (origin.endsWith('.betzenith.app') || origin === 'https://betzenith.app') {
      console.log('✅ CORS allowed (betzenith.app domain):', origin);
      return callback(null, true);
    }

    // Block other origins
    console.log('❌ CORS blocked for origin:', origin);
    return callback(new Error('CORS policy does not allow this origin'), false);
  },
  credentials: true,
  exposedHeaders: ['Authorization']
}));

// ============ ADDITIONAL CORS HEADERS MIDDLEWARE ============
// This ensures CORS headers are set even if the main CORS middleware fails
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow any vercel.app, onrender.com, or betzenith.app origin
  if (origin && (
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.onrender.com') ||
    origin.endsWith('.betzenith.app') ||
    origin === 'https://betzenith.app' ||
    allowedOrigins.includes(origin)
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ============ RATE LIMITING (AFTER CORS) ============
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip preflight so OPTIONS never counts against the limit
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res) => {
    // Return CORS headers on 429 so the browser doesn't mask it as a CORS error
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    res.status(429).json({ success: false, message: 'Too many requests, please try again later.' });
  }
});
app.use('/api', limiter);

// ============ MIDDLEWARE ============
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(morgan('dev'));

// ============ STATIC FILES ============
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ SOCKET.IO ============
app.set('io', io);
global.io = io; // NEW: expose io globally for services (aiMatchService live updates)

// Track online users and match subscribers
const onlineUsers = new Map();
const matchSubscribers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // User authentication
  socket.on('authenticate', (userId) => {
    socket.join(`user-${userId}`);
    onlineUsers.set(userId, socket.id);
    io.emit('user-online', { userId, online: onlineUsers.size });
    console.log(`👤 User ${userId} authenticated`);
  });

  // Subscribe to match updates
  socket.on('subscribe-to-match', (matchId) => {
    socket.join(`match-${matchId}`);

    // Track subscribers
    if (!matchSubscribers.has(matchId)) {
      matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket.id);

    console.log(`📊 Socket ${socket.id} subscribed to match ${matchId} (${matchSubscribers.get(matchId).size} total)`);
  });

  // Unsubscribe from match
  socket.on('unsubscribe-from-match', (matchId) => {
    socket.leave(`match-${matchId}`);

    if (matchSubscribers.has(matchId)) {
      matchSubscribers.get(matchId).delete(socket.id);
      if (matchSubscribers.get(matchId).size === 0) {
        matchSubscribers.delete(matchId);
      }
    }
  });

  // Get all live matches - FOR THE LIVE TICKER
  socket.on('get-live-matches', async () => {
    try {
      const Match = require('./models/Match');
      const liveMatches = await Match.find({
        status: { $in: ['LIVE', 'HALFTIME'] }
      }).select('homeTeam awayTeam score minute status league');

      socket.emit('live-matches-list', liveMatches);
      console.log(`📋 Sent ${liveMatches.length} live matches to client ${socket.id}`);
    } catch (error) {
      console.error('❌ Error fetching live matches:', error);
    }
  });

  // Join bet slip room (for cashout updates)
  socket.on('join-bet-slip', (betId) => {
    socket.join(`bet-${betId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove from online users
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user-offline', { userId });
        break;
      }
    }

    // Remove from match subscribers
    for (const [matchId, subscribers] of matchSubscribers.entries()) {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          matchSubscribers.delete(matchId);
        }
      }
    }

    console.log('❌ Client disconnected:', socket.id);
  });
});

// ============ DATABASE CONNECTION ============
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');

    // ============ START REAL-TIME UPDATES ============
    try {
      const scheduler = require('./services/UpdateScheduler');
      scheduler.start();
      console.log('⏰ Real-time update scheduler started');
    } catch (error) {
      console.log('⚠️ Update scheduler not available yet');
    }

    // Check if we have matches, if not fetch from API
    const Match = require('./models/Match');

    Match.countDocuments().then(async (count) => {
      if (count === 0) {
        console.log('📋 No matches found, fetching from API...');
        try {
          const feedService = require('./services/DataFeedService');
          const fixtures = await feedService.fetchTodaysFixtures();
          console.log(`✅ Fetched ${fixtures.length} fixtures from API`);
        } catch (error) {
          console.log('⚠️ Could not fetch from API:', error.message);
        }
      } else {
        console.log(`📊 Found ${count} existing matches in database`);
      }
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ============ TEMPORARY ADMIN RESET (remove after use) ============
// Placed BEFORE the /api/admin router so it bypasses admin auth middleware
app.post('/reset-now-4656460', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== 'reset-now-4656460') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const User = require('./models/User');
    const result = await User.updateMany({}, { balance: 0 });
    console.log(`✅ Reset ${result.modifiedCount} users to balance 0`);
    res.json({ success: true, reset: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ============ END TEMPORARY ADMIN RESET ============

// ============ TEMPORARY RESETTLE (remove after use) ============
// One-shot: re-run settlement for every FINISHED match that still has
// pending bets. Fixes bets stuck because settlement ran before the
// 'selections.match' query fix was deployed.
app.post('/resettle-all-4656460', async (req, res) => {
  try {
    const { secret } = req.body;
    if (secret !== 'resettle-now-4656460') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const Match = require('./models/Match');
    const { settleBetsForMatch } = require('./services/betSettlementService');

    const finished = await Match.find({ status: 'FINISHED' });
    const details = [];
    let totalSettled = 0, totalWon = 0, totalLost = 0, totalVoided = 0, totalPaid = 0;

    for (const m of finished) {
      try {
        const r = await settleBetsForMatch(m._id, m, global.io);
        if (r.settled > 0) {
          details.push({
            matchId: String(m._id),
            label: `${m.homeTeam?.name || '?'} vs ${m.awayTeam?.name || '?'}`,
            score: `${m.score?.home ?? 0}-${m.score?.away ?? 0}`,
            settled: r.settled,
            won: r.won,
            lost: r.lost,
            voided: r.voided,
            paid: r.totalPaid,
          });
          totalSettled += r.settled;
          totalWon += r.won;
          totalLost += r.lost;
          totalVoided += r.voided;
          totalPaid += r.totalPaid;
        }
      } catch (err) {
        console.error(`[resettle] match ${m._id} failed:`, err.message);
      }
    }

    console.log(`✅ Resettled: ${totalSettled} bets (${totalWon}W / ${totalLost}L / ${totalVoided}V)`);

    res.json({
      success: true,
      matchesChecked: finished.length,
      totalSettled,
      totalWon,
      totalLost,
      totalVoided,
      totalPaid: Number(totalPaid.toFixed(2)),
      details,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ============ END TEMPORARY RESETTLE ============

// ============ ROUTES ============
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/bets', require('./routes/bets'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/live', require('./routes/live'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/odds', require('./routes/odds'));
// Add after your other routes
app.use('/api/ai', require('./routes/ai'));
// Add after other routes
app.use('/api/ai-matches', require('./routes/aiMatches'));
// Admin panel (demo) — match scheduling + prediction link generation
app.use('/api/admin-panel', require('./routes/adminPanel'));
// Add this line with your other routes

// Start the AI Match Service
const aiMatchService = require('./services/aiMatchService');
aiMatchService.start();

// Start the Bet Settlement Scheduler
const betSettlementScheduler = require('./services/betSettlementScheduler');
betSettlementScheduler.start();

// ============ DEBUG ROUTES ============
app.get('/debug-routes', (req, res) => {
  try {
    const routes = [];

    function extractRoutes(stack, basePath = '') {
      if (!stack || !stack.forEach) return;

      stack.forEach(layer => {
        if (layer.route) {
          // This is a route
          const methods = Object.keys(layer.route.methods).join(',');
          routes.push({
            path: basePath + layer.route.path,
            methods: methods.toUpperCase()
          });
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // This is a router middleware (like our auth router)
          let routerPath = basePath;

          // Try to get the base path for this router
          if (layer.regexp) {
            let pathStr = layer.regexp.toString();
            // Extract the path pattern
            const match = pathStr.match(/\/\^\\\/(.*?)(?:\\\/\?|\\\?)/);
            if (match && match[1]) {
              routerPath = basePath + '/' + match[1].replace(/\\\//g, '/');
            } else {
              routerPath = basePath;
            }
          }

          // Extract routes from this router
          extractRoutes(layer.handle.stack, routerPath);
        }
      });
    }

    extractRoutes(app._router.stack);

    // Filter to show only auth-related routes
    const authRoutes = routes.filter(r => r.path.includes('auth'));

    res.json({
      success: true,
      totalRoutes: routes.length,
      authRoutes: authRoutes,
      allRoutes: routes // Show all routes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    onlineUsers: onlineUsers.size,
    corsAllowedOrigins: allowedOrigins // Helpful for debugging
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  // Don't leak error details in production
  const error = process.env.NODE_ENV === 'production' ? {} : { stack: err.stack };

  res.status(status).json({
    success: false,
    message,
    ...error
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log('✅ CORS allowed origins:', allowedOrigins);
  console.log('✅ Dynamic CORS: Any *.vercel.app and *.onrender.com subdomains are allowed');
});