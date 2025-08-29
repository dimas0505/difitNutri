require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('MONGO_URL:', process.env.MONGO_URL ? 'Set' : 'Not set');

const testConnection = async () => {
  try {
    console.log('Attempting to connect...');
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME || 'difitNutri',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    await mongoose.disconnect();
    console.log('✅ Connection test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

testConnection();