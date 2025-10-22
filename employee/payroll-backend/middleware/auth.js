import jwt from 'jsonwebtoken';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // ✅ FIX: Add detailed logging for debugging
    console.log('🔐 Auth Middleware - Token Verification:');
    console.log('  - Authorization header exists:', !!req.header('Authorization'));
    console.log('  - Token extracted:', !!token);
    console.log('  - Token length:', token ? token.length : 0);
    console.log('  - JWT_SECRET defined:', !!process.env.JWT_SECRET);
    
    if (!token) {
      console.error('❌ Auth failed: No token provided');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully');
    console.log('  - User ID:', verified.id);
    console.log('  - Is Admin:', verified.isAdmin);
    console.log('  - Token issued at:', new Date(verified.iat * 1000).toISOString());
    console.log('  - Token expires at:', verified.exp ? new Date(verified.exp * 1000).toISOString() : 'Never');
    
    req.user = verified;
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    console.error('  - Error type:', err.name);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please login again' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token, authorization denied' });
    }
    
    res.status(401).json({ message: 'Token verification failed, authorization denied' });
  }
};

export const adminAuth = async (req, res, next) => {
  try {
    console.log('🔐 Admin Auth Middleware:');
    console.log('  - User object exists:', !!req.user);
    console.log('  - User isAdmin flag:', req.user?.isAdmin);
    
    if (!req.user) {
      console.error('❌ Admin auth failed: No user object (auth middleware not called first?)');
      return res.status(401).json({ message: 'Authentication required before admin check' });
    }
    
    if (!req.user.isAdmin) {
      console.error('❌ Admin auth failed: User is not admin');
      console.error('  - User ID:', req.user.id);
      console.error('  - Username:', req.user.username);
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    console.log('✅ Admin auth passed');
    next();
  } catch (err) {
    console.error('❌ Admin auth middleware error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
}; 