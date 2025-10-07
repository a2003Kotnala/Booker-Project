import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Community from '../models/Community.js';
import ReadingSession from '../models/ReadingSession.js';

/**
 * Authentication Middleware
 * Handles JWT verification, user authentication, and role-based access control
 */

/**
 * @desc    Verify JWT token and attach user to request
 * @middleware
 */
export const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }

    // Check if token has required payload
    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active (you can add more checks here)
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please verify your email.',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);

    // Handle specific database errors
    if (error.name === 'CastError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID in token.',
        code: 'INVALID_USER_ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error.',
      code: 'AUTH_SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Verify admin privileges
 * @middleware
 */
export const adminAuth = async (req, res, next) => {
  try {
    // First, run regular auth to get user
    await auth(req, res, () => {});

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Admin auth middleware error:', error);
    
    // If auth already sent a response, don't send another
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Admin authentication failed.',
        code: 'ADMIN_AUTH_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

/**
 * @desc    Optional authentication - attaches user if token exists, but doesn't require it
 * @middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token, continue without user
    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // If token is invalid, continue without user
      req.user = null;
      return next();
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      req.user = null;
      return next();
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Optional auth middleware error:', error);
    
    // In case of error, continue without user
    req.user = null;
    next();
  }
};

/**
 * @desc    Verify email verification status
 * @middleware
 */
export const requireVerifiedEmail = async (req, res, next) => {
  try {
    // First, run regular auth to get user
    await auth(req, res, () => {});

    // Check if email is verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address to access this resource.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Email verification middleware error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Email verification check failed.',
        code: 'EMAIL_VERIFICATION_ERROR'
      });
    }
  }
};

/**
 * @desc    Check if user owns the resource or is admin
 * @middleware
 */
export const requireOwnershipOrAdmin = (resourceModel) => {
  return async (req, res, next) => {
    try {
      // First, run regular auth to get user
      await auth(req, res, () => {});

      const resourceId = req.params.id;
      
      // If user is admin, allow access
      if (req.user.isAdmin) {
        return next();
      }

      // Find the resource
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Check ownership (assuming resources have a 'user' field)
      if (resource.user && resource.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
          code: 'OWNERSHIP_REQUIRED'
        });
      }

      // Check if resource has createdBy field (for communities, etc.)
      if (resource.createdBy && resource.createdBy.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access resources you created.',
          code: 'CREATOR_ACCESS_REQUIRED'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Ownership check middleware error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Ownership verification failed.',
          code: 'OWNERSHIP_VERIFICATION_ERROR',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  };
};

/**
 * @desc    Check if user has specific role in community
 * @middleware
 */
export const requireCommunityRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      await auth(req, res, () => {});

      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Community ID is required.',
          code: 'COMMUNITY_ID_REQUIRED'
        });
      }

      const community = await Community.findById(id);

      if (!community) {
        return res.status(404).json({
          success: false,
          message: 'Community not found.',
          code: 'COMMUNITY_NOT_FOUND'
        });
      }

      const member = community.members.find(m => m.user.toString() === req.user.id);

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this community.',
          code: 'NOT_COMMUNITY_MEMBER'
        });
      }

      if (roles.length > 0 && !roles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_COMMUNITY_ROLE'
        });
      }

      // Attach member info to request for use in controller
      req.communityMember = member;
      req.community = community;

      next();
    } catch (error) {
      console.error('❌ Community role middleware error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Community role verification failed.',
          code: 'COMMUNITY_ROLE_ERROR'
        });
      }
    }
  };
};

/**
 * @desc    Check if user has completed reading a book
 * @middleware
 */
export const requireBookCompletion = async (req, res, next) => {
  try {
    await auth(req, res, () => {});

    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required.',
        code: 'BOOK_ID_REQUIRED'
      });
    }

    const completedSession = await ReadingSession.findOne({
      user: req.user.id,
      book: id,
      status: 'completed'
    });

    if (!completedSession) {
      return res.status(403).json({
        success: false,
        message: 'You must complete reading this book before performing this action.',
        code: 'BOOK_NOT_COMPLETED'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Book completion middleware error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Book completion verification failed.',
        code: 'BOOK_COMPLETION_ERROR'
      });
    }
  }
};

/**
 * @desc    Rate limiting middleware (basic implementation)
 * @middleware
 */
export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
    skipFailedRequests = false
  } = options;

  const requests = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > now - windowMs);
      if (validTimestamps.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, validTimestamps);
      }
    }
  }, 60000); // Clean up every minute

  return (req, res, next) => {
    const now = Date.now();
    const clientId = req.ip || req.connection.remoteAddress;

    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }

    const clientRequests = requests.get(clientId);
    const recentRequests = clientRequests.filter(time => time > now - windowMs);

    // Check if rate limit exceeded
    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    clientRequests.push(now);
    requests.set(clientId, clientRequests);

    // Set headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - recentRequests.length - 1),
      'X-RateLimit-Reset': Math.ceil((now + windowMs) / 1000)
    });

    next();
  };
};

/**
 * @desc    Logging middleware for authentication attempts
 * @middleware
 */
export const authLogger = (req, res, next) => {
  const start = Date.now();

  // Log the request
  console.log(`🔐 Auth Attempt: ${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);

  // Store the original json method
  const originalJson = res.json;
  
  // Override res.json to log the response
  res.json = function(data) {
    const duration = Date.now() - start;
    
    if (res.statusCode >= 400) {
      console.log(`❌ Auth Failed: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    } else {
      console.log(`✅ Auth Success: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * @desc    CORS middleware for authentication routes
 * @middleware
 */
export const authCors = (req, res, next) => {
  // Allow credentials for authentication
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Specific headers for auth routes
  res.header('Access-Control-Allow-Headers', 
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token');
  
  // Allow specific methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

/**
 * @desc    Security headers middleware for auth routes
 * @middleware
 */
export const authSecurityHeaders = (req, res, next) => {
  // Security headers specific to authentication endpoints
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Prevent caching of auth responses
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');

  next();
};

export default {
  auth,
  adminAuth,
  optionalAuth,
  requireVerifiedEmail,
  requireOwnershipOrAdmin,
  requireCommunityRole,
  requireBookCompletion,
  rateLimit,
  authLogger,
  authCors,
  authSecurityHeaders
};