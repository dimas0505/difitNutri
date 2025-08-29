require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const MemoryStore = require('./config/memoryStore');
const { hashPassword, nowISO } = require('./utils/auth');
const User = require('./models/User');
const { v4: uuidv4 } = require('uuid');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const prescriptionRoutes = require('./routes/prescriptions');
const inviteRoutes = require('./routes/invites');

const app = express();
const PORT = process.env.PORT || 8000;

// Global storage - will be either MongoDB or MemoryStore
global.db = null;
global.isMemoryMode = false;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// CORS configuration for VS Code Online and development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and VS Code Online preview URLs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];
    
    // Allow VS Code Online preview URLs (pattern: https://[codespace]-[port].githubpreview.dev)
    if (origin.includes('.githubpreview.dev') || 
        origin.includes('.github.dev') ||
        origin.includes('localhost') ||
        process.env.CORS_ORIGINS === '*') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'DiNutri API',
    version: '1.0.0',
    database: global.isMemoryMode ? 'memory' : 'mongodb'
  });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'DiNutri API running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes); // /api/me
app.use('/api/patients', patientRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/invites', inviteRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ detail: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ detail: 'Endpoint not found' });
});

// Seed default nutritionist user (MongoDB version)
const seedDefaultUser = async () => {
  try {
    const existingUser = await User.findOne({ email: 'pro@dinutri.app' });
    if (existingUser) {
      console.log('✅ Default nutritionist already exists');
      return;
    }

    const hashedPassword = await hashPassword('password123');
    const now = nowISO();
    
    const userData = {
      id: uuidv4(),
      role: 'nutritionist',
      name: 'Pro Nutritionist',
      email: 'pro@dinutri.app',
      passwordHash: hashedPassword,
      createdAt: now,
      updatedAt: now
    };

    const user = new User(userData);
    await user.save();
    
    console.log('✅ Default nutritionist created: pro@dinutri.app / password123');
  } catch (error) {
    console.error('❌ Error seeding default user:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Start listening first
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 DiNutri API server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`);
      console.log(`🔑 Default login: pro@dinutri.app / password123`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 For VS Code Online: https://[codespace]-${PORT}.githubpreview.dev`);
      }
    });

    // Try to connect to MongoDB first
    try {
      const connectPromise = connectDB();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      await seedDefaultUser();
      console.log('✅ MongoDB connected and seeded');
    } catch (dbError) {
      console.error('⚠️ MongoDB connection failed, switching to memory mode:', dbError.message);
      
      // Fallback to memory store
      global.isMemoryMode = true;
      global.db = new MemoryStore();
      await global.db.connect();
      console.log('✅ Memory store initialized');
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();