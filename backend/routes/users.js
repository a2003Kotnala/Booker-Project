import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  addToBookshelf,
  removeFromBookshelf,
  getBookshelf,
  updateReadingProgress,
  getUserStatistics,
  updateReadingGoals,
  searchUsers,
  deleteAccount
} from '../controllers/userController.js';
import { auth, rateLimit, optionalAuth } from '../middleware/auth.js';
import { userValidations, validatePagination, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/users/:identifier
 * @desc    Get user profile by ID or username
 * @access  Public
 * @rateLimit 100 requests per minute
 */
router.get(
  '/:identifier',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many profile requests, please try again later.'
  }),
  optionalAuth, // Optional auth to check if it's own profile
  getUserProfile
);

/**
 * @route   GET /api/users/search
 * @desc    Search users by username or name
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/search',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many user search requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  searchUsers
);

// ========== PROTECTED ROUTES (Require Authentication) ==========

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.put(
  '/profile',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many profile update requests, please try again later.'
  }),
  auth,
  userValidations.profileUpdate,
  updateUserProfile
);

/**
 * @route   POST /api/users/bookshelf
 * @desc    Add book to user's bookshelf
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.post(
  '/bookshelf',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many bookshelf update requests, please try again later.'
  }),
  auth,
  userValidations.bookshelf,
  addToBookshelf
);

/**
 * @route   DELETE /api/users/bookshelf
 * @desc    Remove book from user's bookshelf
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.delete(
  '/bookshelf',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many bookshelf removal requests, please try again later.'
  }),
  auth,
  userValidations.bookshelf,
  removeFromBookshelf
);

/**
 * @route   GET /api/users/bookshelf/:shelfType?
 * @desc    Get user's bookshelf
 * @access  Private
 * @rateLimit 100 requests per minute
 */
router.get(
  '/bookshelf/:shelfType?',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many bookshelf requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  getBookshelf
);

/**
 * @route   PUT /api/users/reading-progress
 * @desc    Update reading progress for a book
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.put(
  '/reading-progress',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many progress update requests, please try again later.'
  }),
  auth,
  userValidations.readingProgress,
  updateReadingProgress
);

/**
 * @route   GET /api/users/statistics
 * @desc    Get user's reading statistics
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/statistics',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many statistics requests, please try again later.'
  }),
  auth,
  getUserStatistics
);

/**
 * @route   PUT /api/users/reading-goals
 * @desc    Update user's reading goals
 * @access  Private
 * @rateLimit 20 requests per minute
 */
router.put(
  '/reading-goals',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many goal update requests, please try again later.'
  }),
  auth,
  userValidations.readingGoals,
  updateReadingGoals
);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 * @rateLimit 5 requests per hour
 */
router.delete(
  '/account',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many account deletion requests, please try again later.'
  }),
  auth,
  deleteAccount
);

// ========== FRIENDS & SOCIAL FEATURES ==========

/**
 * @route   GET /api/users/friends
 * @desc    Get user's friends list
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/friends',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many friend list requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get friends list
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Friends list endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   POST /api/users/friends/request
 * @desc    Send friend request
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/friends/request',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many friend request attempts, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to send friend requests
    const { userId, message } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Friend request functionality not implemented yet',
      data: {
        userId,
        message
      }
    });
  }
);

/**
 * @route   POST /api/users/friends/request/:requestId/accept
 * @desc    Accept friend request
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/friends/request/:requestId/accept',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many friend request responses, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to accept friend requests
    const { requestId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Friend request acceptance not implemented yet',
      data: {
        requestId
      }
    });
  }
);

/**
 * @route   POST /api/users/friends/request/:requestId/decline
 * @desc    Decline friend request
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/friends/request/:requestId/decline',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many friend request responses, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to decline friend requests
    const { requestId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Friend request decline not implemented yet',
      data: {
        requestId
      }
    });
  }
);

/**
 * @route   DELETE /api/users/friends/:friendId
 * @desc    Remove friend
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.delete(
  '/friends/:friendId',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many friend removal requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to remove friends
    const { friendId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Friend removal not implemented yet',
      data: {
        friendId
      }
    });
  }
);

// ========== USER ACTIVITY & HISTORY ==========

/**
 * @route   GET /api/users/activity/recent
 * @desc    Get user's recent activity
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/activity/recent',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many activity requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get recent activity
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Recent activity endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   GET /api/users/activity/reading-history
 * @desc    Get user's reading history
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/activity/reading-history',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many reading history requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get reading history
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Reading history endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   GET /api/users/activity/search-history
 * @desc    Get user's search history
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/activity/search-history',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many search history requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get search history
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Search history endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   DELETE /api/users/activity/search-history
 * @desc    Clear user's search history
 * @access  Private
 * @rateLimit 10 requests per minute
 */
router.delete(
  '/activity/search-history',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many search history clearance requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to clear search history
    res.status(501).json({
      success: false,
      message: 'Search history clearance not implemented yet'
    });
  }
);

// ========== USER PREFERENCES & SETTINGS ==========

/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/preferences',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many preference requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get user preferences
    res.status(501).json({
      success: false,
      message: 'Preferences endpoint not implemented yet'
    });
  }
);

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.put(
  '/preferences',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many preference update requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to update preferences
    const { notifications, privacy, readingPreferences } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Preferences update not implemented yet',
      data: {
        notifications: notifications ? 'updated' : 'not updated',
        privacy: privacy ? 'updated' : 'not updated',
        readingPreferences: readingPreferences ? 'updated' : 'not updated'
      }
    });
  }
);

/**
 * @route   GET /api/users/settings
 * @desc    Get user settings
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/settings',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many settings requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get user settings
    res.status(501).json({
      success: false,
      message: 'Settings endpoint not implemented yet'
    });
  }
);

// ========== USER ACHIEVEMENTS & BADGES ==========

/**
 * @route   GET /api/users/achievements
 * @desc    Get user achievements and badges
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/achievements',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many achievement requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get achievements
    res.status(501).json({
      success: false,
      message: 'Achievements endpoint not implemented yet'
    });
  }
);

/**
 * @route   GET /api/users/achievements/leaderboard
 * @desc    Get achievements leaderboard
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/achievements/leaderboard',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many leaderboard requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get leaderboard
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Leaderboard endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

// ========== USER RECOMMENDATIONS ==========

/**
 * @route   GET /api/users/recommendations/friends
 * @desc    Get friend recommendations
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/recommendations/friends',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many friend recommendation requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get friend recommendations
    const { page = 1, limit = 10 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Friend recommendations endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   GET /api/users/recommendations/communities
 * @desc    Get community recommendations
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/recommendations/communities',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many community recommendation requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get community recommendations
    const { page = 1, limit = 10 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Community recommendations endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

// ========== USER EXPORT & DATA MANAGEMENT ==========

/**
 * @route   POST /api/users/export/data
 * @desc    Request export of user data
 * @access  Private
 * @rateLimit 5 requests per day
 */
router.post(
  '/export/data',
  rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // limit each IP to 5 requests per day
    message: 'Too many data export requests, please try again tomorrow.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to export user data
    res.status(501).json({
      success: false,
      message: 'Data export functionality not implemented yet'
    });
  }
);

/**
 * @route   GET /api/users/export/status/:requestId
 * @desc    Check status of data export
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/export/status/:requestId',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many export status requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to check export status
    const { requestId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Export status check not implemented yet',
      data: {
        requestId
      }
    });
  }
);

// ========== HEALTH CHECK & METADATA ==========

/**
 * @route   GET /api/users/health
 * @desc    Users service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users service is healthy',
    timestamp: new Date().toISOString(),
    service: 'BookifyMe Users API',
    version: '1.0.0'
  });
});

/**
 * @route   GET /api/users/metadata
 * @desc    Get users API metadata and available endpoints
 * @access  Public
 */
router.get('/metadata', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'BookifyMe Users API',
      version: '1.0.0',
      description: 'Comprehensive user management and profile API',
      features: [
        'User profile management',
        'Bookshelf organization (currently reading, want to read, finished)',
        'Reading progress tracking',
        'Reading statistics and analytics',
        'Reading goals management',
        'Social features (friends, activity)',
        'User preferences and settings',
        'Achievements and badges'
      ],
      endpoints: {
        public: [
          'GET /api/users/:identifier',
          'GET /api/users/search',
          'GET /api/users/achievements/leaderboard'
        ],
        protected: [
          'PUT /api/users/profile',
          'POST /api/users/bookshelf',
          'DELETE /api/users/bookshelf',
          'GET /api/users/bookshelf/:shelfType?',
          'PUT /api/users/reading-progress',
          'GET /api/users/statistics',
          'PUT /api/users/reading-goals',
          'DELETE /api/users/account',
          'GET /api/users/activity/recent',
          'GET /api/users/preferences',
          'PUT /api/users/preferences',
          'GET /api/users/achievements'
        ]
      },
      rateLimiting: {
        profileView: '100 requests per minute',
        profileUpdate: '30 requests per minute',
        bookshelf: '60 requests per minute',
        readingProgress: '60 requests per minute',
        accountDeletion: '5 requests per hour'
      }
    }
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for user routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `User route not found: ${req.originalUrl}`,
    code: 'USER_ROUTE_NOT_FOUND',
    availableEndpoints: [
      '/api/users/:identifier',
      '/api/users/profile',
      '/api/users/bookshelf',
      '/api/users/reading-progress',
      '/api/users/statistics',
      '/api/users/reading-goals',
      '/api/users/search'
    ]
  });
});

// Error handling middleware for user routes
router.use((error, req, res, next) => {
  console.error('❌ User route error:', error);

  // Handle rate limit errors
  if (error.type === 'rate-limit-exceeded') {
    return res.status(429).json({
      success: false,
      message: error.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(error.retryAfter / 1000)
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

  // Handle user not found errors
  if (error.message?.includes('not found') || error.kind === 'ObjectId') {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  // Handle duplicate entry errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `User with this ${field} already exists`,
      field: field,
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Handle permission errors
  if (error.message?.includes('permission') || error.message?.includes('not authorized')) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: 'PERMISSION_DENIED'
    });
  }

  // Handle book not found in bookshelf errors
  if (error.message?.includes('not found in') || error.message?.includes('not in')) {
    return res.status(404).json({
      success: false,
      message: error.message,
      code: 'BOOK_NOT_IN_SHELF'
    });
  }

  // Handle account deletion confirmation errors
  if (error.message?.includes('confirmation')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'CONFIRMATION_REQUIRED'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    code: 'USER_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;