const mongoose = require('mongoose');

const connectDB = async () => {
  // Don't attempt connection if we're forcing memory mode
  if (process.env.FORCE_MEMORY_MODE === 'true') {
    throw new Error('Memory mode forced');
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME || 'difitNutri',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;