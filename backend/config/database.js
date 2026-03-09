const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('Environment:', process.env.NODE_ENV || 'development');

    // Use provided MONGODB_URI or fallback to a local MongoDB instance
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';

    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  No MONGODB_URI found in environment variables, using local fallback');
    }

    // Log sanitized URI for debugging (hide password)
    const sanitizedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log(`   Using URI: ${sanitizedUri}`);
    console.log('   Connection options: serverSelectionTimeoutMS=30000, socketTimeoutMS=45000');

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds for Atlas
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 100, // Increased from 10 to 100 to handle more concurrent requests
      minPoolSize: 5, // Maintain at least 5 connections always warm
      heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
      retryWrites: true,
      retryReads: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    console.log('✅ MongoDB Connected successfully');
    console.log(`   Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
      console.error('MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      console.warn('⚠️  MongoDB disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    // Log errors but do not throw so the HTTP server can start for demo purposes.
    logger.error(`Error connecting to MongoDB: ${error && error.message ? error.message : error}`);
    console.error('❌ MongoDB connection failed:', error.message || error);
    if (error.code) console.error(`   Error code: ${error.code}`);
    if (error.name) console.error(`   Error type: ${error.name}`);
    if (error.reason) console.error(`   Reason: ${JSON.stringify(error.reason, null, 2)}`);
    if (error.stack) console.error(`   Stack: ${error.stack}`);

    // Check common issues
    if (error.message?.includes('ENOTFOUND')) {
      console.error('   🔍 DNS resolution failed - check your internet connection');
    } else if (error.message?.includes('authentication failed')) {
      console.error('   🔍 Authentication failed - check your username/password in MONGODB_URI');
    } else if (error.message?.includes('connection timed out')) {
      console.error('   🔍 Connection timed out - check your network or MongoDB Atlas IP whitelist');
    }

    console.error('   Please check your MONGODB_URI in .env or start a local MongoDB instance.');
    console.error('   The server will continue to run, but database operations will fail until connection is restored.');
    console.error('');

    // Do not re-throw: return null to indicate DB not connected.
    return null;
  }
};

module.exports = connectDB;
