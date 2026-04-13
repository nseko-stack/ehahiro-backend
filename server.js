const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ["http://localhost:3000", "https://ehahiro-frontend.vercel.app"];
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/markets', require('./routes/markets'));
app.use('/api/crops', require('./routes/crops'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Join user-specific room for personalized updates
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });
});

// Make io available to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    const baseUrl = process.env.NODE_ENV === 'production' ? `https://ehahiro-backend-3.onrender.com` : `http://localhost:${PORT}`;
    console.log(`🚀 Agri-Price Backend running on ${baseUrl}`);
    console.log(`📱 Health: ${baseUrl}/health`);
    console.log(`🔌 WebSocket: wss://${baseUrl.replace('https://', '').replace('http://', '')}`);
});