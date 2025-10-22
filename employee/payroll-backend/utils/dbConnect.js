import mongoose from 'mongoose';

/**
 * Global cache for MongoDB connection
 * In serverless environments (Vercel), we need to reuse connections across function invocations
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with serverless-optimized settings
 * Reuses existing connection if available (critical for Vercel performance)
 */
async function connectDB() {
  // Return existing connection if available
  if (cached.conn) {
    console.log('📗 Using cached MongoDB connection');
    return cached.conn;
  }

  // Return pending connection promise if one exists
  if (cached.promise) {
    console.log('⏳ Awaiting pending MongoDB connection...');
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // Serverless-optimized Mongoose options
  const opts = {
    bufferCommands: false, // Disable buffering (fail fast in serverless)
    maxPoolSize: 10, // Smaller pool for serverless (reduced from 50)
    serverSelectionTimeoutMS: 5000, // Faster timeout for serverless (5s instead of 10s)
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    connectTimeoutMS: 10000, // Timeout for initial connection
  };

  // Set strictQuery to false
  mongoose.set('strictQuery', false);

  // Create new connection promise
  cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
    console.log('✅ MongoDB Connected (Serverless Mode)');
    return mongoose;
  });

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
