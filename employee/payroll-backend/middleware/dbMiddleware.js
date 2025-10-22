import connectDB from '../utils/dbConnect.js';

/**
 * Middleware to ensure MongoDB connection before processing requests
 * Critical for serverless environments (Vercel) where connections aren't persistent
 */
export const ensureDBConnection = async (req, res, next) => {
  try {
    // Ensure DB is connected (uses cached connection if available)
    await connectDB();
    next();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Database connection failed',
      error: error.message 
    });
  }
};
