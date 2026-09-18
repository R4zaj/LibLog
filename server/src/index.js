const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Make sure your .env file is in the server/ folder.');
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes');
const literatureRoutes = require('./routes/literatureRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const borrowingRoutes = require('./routes/borrowingRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Trust reverse proxy (Render) to correctly parse X-Forwarded-For headers
app.set('trust proxy', 1);

// Dev servers (Vite, Metro/Expo web) pick whatever port is free, so allow any localhost port
// rather than hardcoding one — native/Electron requests carry no Origin header and are unaffected.
const localDevOriginPattern = /^(https?:\/\/(localhost|127\.0\.0\.1):\d+|exp:\/\/127\.0\.0\.1:\d+)$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || localDevOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter limit for authentication
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/literatures', literatureRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/borrowing', borrowingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// Lightweight health check endpoint (no DB hit) — used to wake up Render from cold start
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message, stack: err.stack });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
