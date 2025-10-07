import express from 'express';
import {
  createCommunity,
  getCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  createDiscussion,
  getDiscussions,
  toggleDiscussionLike,
  addComment,
  setCurrentBook,
  getCommunityStats,
  getUserCommunities
} from '../controllers/communityController.js';
import { auth, requireCommunityRole, rateLimit } from '../middleware/auth.js';
import { communityValidations, validatePagination, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/communities
 * @desc    Get all communities with filtering and pagination
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many community requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  getCommunities
);

/**
 * @route   GET /api/communities/:id
 * @desc    Get community details by ID
 * @access  Public
 * @rateLimit 100 requests per minute
 */
router.get(
  '/:id',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many community detail requests, please try again later.'
  }),
  communityValidations.communityId,
  getCommunityById
);

/**
 * @route   GET /api/communities/:id/discussions
 * @desc    Get community discussions
 * @access  Public
 * @rateLimit 100 requests per minute
 */
router.get(
  '/:id/discussions',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many discussion requests, please try again later.'
  }),
  communityValidations.communityId,
  validatePagination,
  handleValidationErrors,
  getDiscussions
);

/**
 * @route   GET /api/communities/:id/statistics
 * @desc    Get community statistics
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/:id/statistics',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many statistics requests, please try again later.'
  }),
  communityValidations.communityId,
  getCommunityStats
);

// ========== PROTECTED ROUTES (Require Authentication) ==========

/**
 * @route   POST /api/communities
 * @desc    Create a new community/reading group
 * @access  Private
 * @rateLimit 10 requests per hour
 */
router.post(
  '/',
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many community creation attempts, please try again later.'
  }),
  auth,
  communityValidations.create,
  createCommunity
);

/**
 * @route   POST /api/communities/:id/join
 * @desc    Join a community
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/:id/join',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many join requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  joinCommunity
);

/**
 * @route   POST /api/communities/:id/leave
 * @desc    Leave a community
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/:id/leave',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many leave requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  leaveCommunity
);

/**
 * @route   GET /api/communities/user/joined
 * @desc    Get user's communities
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/user/joined',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many user community requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  getUserCommunities
);

// ========== COMMUNITY DISCUSSION ROUTES ==========

/**
 * @route   POST /api/communities/:id/discussions
 * @desc    Create a discussion post in community
 * @access  Private (Community Members Only)
 * @rateLimit 20 requests per minute
 */
router.post(
  '/:id/discussions',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many discussion creation attempts, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  communityValidations.discussion,
  createDiscussion
);

/**
 * @route   POST /api/communities/:id/discussions/:discussionId/like
 * @desc    Like/unlike a discussion
 * @access  Private (Community Members Only)
 * @rateLimit 60 requests per minute
 */
router.post(
  '/:id/discussions/:discussionId/like',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many like requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  toggleDiscussionLike
);

/**
 * @route   POST /api/communities/:id/discussions/:discussionId/comments
 * @desc    Add comment to discussion
 * @access  Private (Community Members Only)
 * @rateLimit 30 requests per minute
 */
router.post(
  '/:id/discussions/:discussionId/comments',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many comment requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  communityValidations.comment,
  addComment
);

// ========== COMMUNITY MANAGEMENT ROUTES (Admins/Moderators) ==========

/**
 * @route   PUT /api/communities/:id/current-book
 * @desc    Set current book for community
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 10 requests per minute
 */
router.put(
  '/:id/current-book',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many book update requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  setCurrentBook
);

/**
 * @route   PUT /api/communities/:id/settings
 * @desc    Update community settings
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 10 requests per minute
 */
router.put(
  '/:id/settings',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many settings update requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  (req, res) => {
    // This would be implemented to update community settings
    res.status(501).json({
      success: false,
      message: 'Community settings update not implemented yet'
    });
  }
);

/**
 * @route   PUT /api/communities/:id/members/:userId/role
 * @desc    Update member role
 * @access  Private (Admin Only)
 * @rateLimit 20 requests per minute
 */
router.put(
  '/:id/members/:userId/role',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many role update requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin']),
  (req, res) => {
    // This would be implemented to update member roles
    const { id, userId } = req.params;
    const { role } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Member role update not implemented yet',
      data: {
        communityId: id,
        userId,
        role
      }
    });
  }
);

/**
 * @route   POST /api/communities/:id/members/:userId/ban
 * @desc    Ban a member from community
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 10 requests per minute
 */
router.post(
  '/:id/members/:userId/ban',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many ban requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  (req, res) => {
    // This would be implemented to ban members
    const { id, userId } = req.params;
    const { reason } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Member ban functionality not implemented yet',
      data: {
        communityId: id,
        userId,
        reason
      }
    });
  }
);

/**
 * @route   POST /api/communities/:id/members/:userId/unban
 * @desc    Unban a member from community
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 10 requests per minute
 */
router.post(
  '/:id/members/:userId/unban',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many unban requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  (req, res) => {
    // This would be implemented to unban members
    const { id, userId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Member unban functionality not implemented yet',
      data: {
        communityId: id,
        userId
      }
    });
  }
);

// ========== COMMUNITY EVENTS ROUTES ==========

/**
 * @route   GET /api/communities/:id/events
 * @desc    Get community events
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/:id/events',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many event requests, please try again later.'
  }),
  communityValidations.communityId,
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get community events
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Community events endpoint not implemented yet',
      data: {
        communityId: id,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   POST /api/communities/:id/events
 * @desc    Create a community event
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 10 requests per minute
 */
router.post(
  '/:id/events',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many event creation requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  (req, res) => {
    // This would be implemented to create events
    const { id } = req.params;
    const { title, description, type, startDate, endDate, location } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Event creation not implemented yet',
      data: {
        communityId: id,
        title,
        type,
        startDate
      }
    });
  }
);

/**
 * @route   POST /api/communities/:id/events/:eventId/rsvp
 * @desc    RSVP to a community event
 * @access  Private (Community Members Only)
 * @rateLimit 30 requests per minute
 */
router.post(
  '/:id/events/:eventId/rsvp',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many RSVP requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  (req, res) => {
    // This would be implemented to handle RSVPs
    const { id, eventId } = req.params;
    const { status } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Event RSVP functionality not implemented yet',
      data: {
        communityId: id,
        eventId,
        status
      }
    });
  }
);

// ========== COMMUNITY INVITATIONS ==========

/**
 * @route   POST /api/communities/:id/invite
 * @desc    Invite users to community (for private communities)
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 20 requests per minute
 */
router.post(
  '/:id/invite',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many invitation requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  (req, res) => {
    // This would be implemented to send invitations
    const { id } = req.params;
    const { userIds, emailAddresses, message } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Community invitation functionality not implemented yet',
      data: {
        communityId: id,
        invitedUsers: userIds?.length || 0,
        invitedEmails: emailAddresses?.length || 0
      }
    });
  }
);

// ========== COMMUNITY MODERATION ==========

/**
 * @route   GET /api/communities/:id/reports
 * @desc    Get reported content (for moderators)
 * @access  Private (Admin/Moderator Only)
 * @rateLimit 30 requests per minute
 */
router.get(
  '/:id/reports',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many report requests, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  requireCommunityRole(['admin', 'moderator']),
  (req, res) => {
    // This would be implemented to get reported content
    const { id } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Report management not implemented yet',
      data: {
        communityId: id
      }
    });
  }
);

/**
 * @route   POST /api/communities/:id/discussions/:discussionId/report
 * @desc    Report a discussion
 * @access  Private (Community Members Only)
 * @rateLimit 10 requests per minute
 */
router.post(
  '/:id/discussions/:discussionId/report',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many report submissions, please try again later.'
  }),
  auth,
  communityValidations.communityId,
  (req, res) => {
    // This would be implemented to report content
    const { id, discussionId } = req.params;
    const { reason } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Content reporting not implemented yet',
      data: {
        communityId: id,
        discussionId,
        reason
      }
    });
  }
);

// ========== COMMUNITY DISCOVERY ==========

/**
 * @route   GET /api/communities/discover/trending
 * @desc    Get trending communities
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/discover/trending',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many trending community requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to get trending communities
    const { limit = 10 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Trending communities endpoint not implemented yet',
      data: {
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   GET /api/communities/discover/genres
 * @desc    Get popular community genres
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/discover/genres',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many genre requests, please try again later.'
  }),
  (req, res) => {
    // This would typically come from a database or config
    const popularGenres = [
      'Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Romance',
      'Non-Fiction', 'Biography', 'History', 'Science', 'Self-Help',
      'Young Adult', 'Classics', 'Contemporary', 'Thriller', 'Horror'
    ];
    
    res.status(200).json({
      success: true,
      data: {
        genres: popularGenres.map(genre => ({
          name: genre,
          slug: genre.toLowerCase().replace(/\s+/g, '-'),
          communityCount: Math.floor(Math.random() * 50) + 10 // Mock data
        }))
      }
    });
  }
);

// ========== HEALTH CHECK & METADATA ==========

/**
 * @route   GET /api/communities/health
 * @desc    Communities service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Communities service is healthy',
    timestamp: new Date().toISOString(),
    service: 'BookifyMe Communities API',
    version: '1.0.0'
  });
});

/**
 * @route   GET /api/communities/metadata
 * @desc    Get communities API metadata and available endpoints
 * @access  Public
 */
router.get('/metadata', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'BookifyMe Communities API',
      version: '1.0.0',
      description: 'Reading communities and group management API',
      features: [
        'Community creation and management',
        'Member management and roles',
        'Discussion forums with comments and likes',
        'Community events and RSVPs',
        'Book clubs and reading groups',
        'Moderation tools',
        'Community statistics and analytics'
      ],
      endpoints: {
        public: [
          'GET /api/communities',
          'GET /api/communities/:id',
          'GET /api/communities/:id/discussions',
          'GET /api/communities/:id/statistics',
          'GET /api/communities/discover/genres'
        ],
        protected: [
          'POST /api/communities',
          'POST /api/communities/:id/join',
          'POST /api/communities/:id/leave',
          'GET /api/communities/user/joined',
          'POST /api/communities/:id/discussions',
          'POST /api/communities/:id/discussions/:discussionId/like',
          'POST /api/communities/:id/discussions/:discussionId/comments'
        ],
        moderator: [
          'PUT /api/communities/:id/current-book',
          'PUT /api/communities/:id/settings',
          'POST /api/communities/:id/events',
          'POST /api/communities/:id/invite'
        ]
      },
      rateLimiting: {
        communityList: '60 requests per minute',
        communityDetails: '100 requests per minute',
        discussions: '100 requests per minute',
        joinLeave: '30 requests per minute',
        discussionCreation: '20 requests per minute'
      }
    }
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for community routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Community route not found: ${req.originalUrl}`,
    code: 'COMMUNITY_ROUTE_NOT_FOUND',
    availableEndpoints: [
      '/api/communities',
      '/api/communities/:id',
      '/api/communities/:id/discussions',
      '/api/communities/:id/join',
      '/api/communities/user/joined',
      '/api/communities/:id/statistics'
    ]
  });
});

// Error handling middleware for community routes
router.use((error, req, res, next) => {
  console.error('❌ Community route error:', error);

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

  // Handle community not found errors
  if (error.message?.includes('not found') || error.kind === 'ObjectId') {
    return res.status(404).json({
      success: false,
      message: 'Community not found',
      code: 'COMMUNITY_NOT_FOUND'
    });
  }

  // Handle permission errors
  if (error.message?.includes('permission') || error.message?.includes('Only') || error.message?.includes('must be')) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: 'PERMISSION_DENIED'
    });
  }

  // Handle duplicate community name errors
  if (error.message?.includes('already exists')) {
    return res.status(409).json({
      success: false,
      message: error.message,
      code: 'DUPLICATE_COMMUNITY'
    });
  }

  // Handle member already joined errors
  if (error.message?.includes('already a member')) {
    return res.status(409).json({
      success: false,
      message: error.message,
      code: 'ALREADY_MEMBER'
    });
  }

  // Handle not member errors
  if (error.message?.includes('not a member')) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: 'NOT_MEMBER'
    });
  }

  // Handle community full errors
  if (error.message?.includes('maximum member limit')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'COMMUNITY_FULL'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    code: 'COMMUNITY_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;