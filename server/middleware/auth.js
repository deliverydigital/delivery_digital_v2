import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { isMongoAvailable } from '../config/mongodb.js';
import rateLimit from 'express-rate-limit';

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    // Check if MongoDB is available
    if (!isMongoAvailable()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database service unavailable' 
      });
    }
    
    // Get user from MongoDB
    const user = await User.findById(decoded.userId)
      .select('_id email name company role status')
      .where('status').equals('active');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token or user not found' 
      });
    }

    // Convert MongoDB document to plain object for consistency
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      company: user.company,
      role: user.role,
      status: user.status
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

// Authorization middleware - check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Check if user owns resource or is admin
const authorizeOwnerOrAdmin = (resourceUserIdField = 'client_id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Admins can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // For other users, check ownership
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Resource ID required' 
        });
      }

      // This would need to be customized based on the specific resource
      // For now, we'll assume the user can access their own resources
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Authorization failed' 
      });
    }
  };
};

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later'
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // limit each IP to 500 requests per windowMs
  'Too many API requests, please try again later'
);

export {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  authRateLimit,
  apiRateLimit
};