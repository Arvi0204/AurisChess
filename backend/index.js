require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// --- Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const { initSocket } = require('./socket');
initSocket(io);

// --- Middleware ---
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json()); // parse JSON request bodies

// --- Database ---
// Importing db.js triggers the connection test on startup
const db = require('./config/db');

// --- Routes ---
const userRoutes = require('./routes/user');
const voiceRoutes = require('./routes/voice');
const telemetryRoutes = require('./routes/telemetry');
app.use('/api/user', userRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/voice/telemetry', telemetryRoutes);

// --- Protected route example ---
const authenticate = require('./middleware/auth');

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await db.oneOrNone(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// --- Health check ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AurisChess API is running.' });
});

// --- Start server (http.Server, not app.listen) ---
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔌 Socket.IO attached`);
});