import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  checkUsernameAvailability,
  verifyToken
} from '../controllers/authController.js';
import { auth, requireVerifiedEmail, authLogger, authSecurityHeaders, rateLimit } from '../middleware/auth.js';
import { authValidations } from '../middleware/validation.js';

const router = express.Router();

// Apply security headers and logging to all auth routes
router.use(authSecurityHeaders);
router.use(authLogger);

// ========== PUBLIC ROUTES ==========

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rateLimit 5 requests per 15 minutes
 */
router.post(
  '/register',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many registration attempts, please try again later.'
  }),
  authValidations.register,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @rateLimit 10 requests per 15 minutes
 */
router.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many login attempts, please try again later.'
  }),
  authValidations.login,
  login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 * @rateLimit 5 requests per minute
 */
router.post(
  '/refresh-token',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many token refresh attempts, please try again later.'
  }),
  refreshToken
);

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check username availability
 * @access  Public
 * @rateLimit 20 requests per minute
 */
router.get(
  '/check-username/:username',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many username checks, please try again later.'
  }),
  checkUsernameAvailability
);

// ========== PROTECTED ROUTES (Require Authentication) ==========

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user / Clear cookie
 * @access  Private
 */
router.post(
  '/logout',
  auth,
  logout
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/profile',
  auth,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  auth,
  requireVerifiedEmail,
  authValidations.profileUpdate,
  updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 * @rateLimit 5 requests per hour
 */
router.put(
  '/change-password',
  auth,
  requireVerifiedEmail,
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many password change attempts, please try again later.'
  }),
  authValidations.passwordChange,
  changePassword
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token validity
 * @access  Private
 */
router.get(
  '/verify',
  auth,
  verifyToken
);

// ========== PASSWORD RESET ROUTES ==========

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @rateLimit 3 requests per hour
 */
router.post(
  '/forgot-password',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per windowMs
    message: 'Too many password reset requests, please try again later.'
  }),
  (req, res) => {
    // This would be implemented in authController
    res.status(501).json({
      success: false,
      message: 'Password reset functionality not implemented yet'
    });
  }
);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 * @rateLimit 5 requests per hour
 */
router.post(
  '/reset-password/:token',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many password reset attempts, please try again later.'
  }),
  (req, res) => {
    // This would be implemented in authController
    res.status(501).json({
      success: false,
      message: 'Password reset functionality not implemented yet'
    });
  }
);

// ========== EMAIL VERIFICATION ROUTES ==========

/**
 * @route   POST /api/auth/send-verification
 * @desc    Send email verification
 * @access  Private
 * @rateLimit 3 requests per hour
 */
router.post(
  '/send-verification',
  auth,
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per windowMs
    message: 'Too many verification email requests, please try again later.'
  }),
  (req, res) => {
    // This would be implemented in authController
    res.status(501).json({
      success: false,
      message: 'Email verification functionality not implemented yet'
    });
  }
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email with token
 * @access  Public
 * @rateLimit 10 requests per hour
 */
router.get(
  '/verify-email/:token',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many email verification attempts, please try again later.'
  }),
  (req, res) => {
    // This would be implemented in authController
    res.status(501).json({
      success: false,
      message: 'Email verification functionality not implemented yet'
    });
  }
);

// ========== ACCOUNT MANAGEMENT ROUTES ==========

/**
 * @route   GET /api/auth/sessions
 * @desc    Get all active sessions for user
 * @access  Private
 */
router.get(
  '/sessions',
  auth,
  (req, res) => {
    // This would be implemented to show active sessions
    res.status(501).json({
      success: false,
      message: 'Session management not implemented yet'
    });
  }
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete(
  '/sessions/:sessionId',
  auth,
  (req, res) => {
    // This would be implemented to revoke sessions
    res.status(501).json({
      success: false,
      message: 'Session management not implemented yet'
    });
  }
);

/**
 * @route   DELETE /api/auth/sessions
 * @desc    Revoke all sessions except current
 * @access  Private
 */
router.delete(
  '/sessions',
  auth,
  (req, res) => {
    // This would be implemented to revoke all other sessions
    res.status(501).json({
      success: false,
      message: 'Session management not implemented yet'
    });
  }
);

// ========== HEALTH CHECK ROUTE ==========

/**
 * @route   GET /api/auth/health
 * @desc    Authentication service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is healthy',
    timestamp: new Date().toISOString(),
    service: 'BookifyMe Auth API',
    version: '1.0.0'
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for auth routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Auth route not found: ${req.originalUrl}`,
    code: 'AUTH_ROUTE_NOT_FOUND'
  });
});

// Error handling middleware for auth routes
router.use((error, req, res, next) => {
  console.error('❌ Auth route error:', error);

  // Handle rate limit errors
  if (error.type === 'rate-limit-exceeded') {
    return res.status(429).json({
      success: false,
      message: error.message,
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      })),
      code: 'VALIDATION_ERROR'
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `User with this ${field} already exists`,
      field: field,
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    code: 'AUTH_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;