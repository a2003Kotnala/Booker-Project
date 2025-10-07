import express from 'express';
import {
  startReadingSession,
  updateReadingProgress,
  pauseReadingSession,
  resumeReadingSession,
  completeReadingSession,
  getCurrentSessions,
  getReadingHistory,
  getReadingStatistics,
  addReadingNote,
  getReadingNotes
} from '../controllers/readingController.js';
import { auth, rateLimit } from '../middleware/auth.js';
import { readingValidations, validatePagination, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// ========== READING SESSION MANAGEMENT ==========

/**
 * @route   POST /api/reading/sessions/start
 * @desc    Start a new reading session
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/sessions/start',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many session start requests, please try again later.'
  }),
  auth,
  readingValidations.startSession,
  startReadingSession
);

/**
 * @route   PUT /api/reading/sessions/update
 * @desc    Update reading progress
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.put(
  '/sessions/update',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many progress update requests, please try again later.'
  }),
  auth,
  readingValidations.updateProgress,
  updateReadingProgress
);

/**
 * @route   PUT /api/reading/sessions/pause
 * @desc    Pause reading session
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.put(
  '/sessions/pause',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many pause requests, please try again later.'
  }),
  auth,
  readingValidations.updateProgress,
  pauseReadingSession
);

/**
 * @route   PUT /api/reading/sessions/resume
 * @desc    Resume reading session
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.put(
  '/sessions/resume',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many resume requests, please try again later.'
  }),
  auth,
  readingValidations.updateProgress,
  resumeReadingSession
);

/**
 * @route   POST /api/reading/sessions/complete
 * @desc    End reading session and mark as completed
 * @access  Private
 * @rateLimit 20 requests per minute
 */
router.post(
  '/sessions/complete',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many session completion requests, please try again later.'
  }),
  auth,
  readingValidations.completeSession,
  completeReadingSession
);

/**
 * @route   GET /api/reading/sessions/current
 * @desc    Get current reading sessions
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/sessions/current',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many current session requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  getCurrentSessions
);

// ========== READING HISTORY & STATISTICS ==========

/**
 * @route   GET /api/reading/history
 * @desc    Get reading history
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/history',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many history requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  getReadingHistory
);

/**
 * @route   GET /api/reading/statistics
 * @desc    Get reading statistics
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
  getReadingStatistics
);

// ========== READING NOTES & ANNOTATIONS ==========

/**
 * @route   POST /api/reading/notes
 * @desc    Add reading note
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/notes',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many note creation requests, please try again later.'
  }),
  auth,
  addReadingNote
);

/**
 * @route   GET /api/reading/sessions/:sessionId/notes
 * @desc    Get reading notes for a session
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/sessions/:sessionId/notes',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many note requests, please try again later.'
  }),
  auth,
  getReadingNotes
);

// ========== READING GOALS & ACHIEVEMENTS ==========

/**
 * @route   GET /api/reading/goals
 * @desc    Get reading goals and progress
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/goals',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many goal requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get reading goals
    res.status(501).json({
      success: false,
      message: 'Reading goals endpoint not implemented yet'
    });
  }
);

/**
 * @route   POST /api/reading/goals
 * @desc    Set or update reading goals
 * @access  Private
 * @rateLimit 20 requests per minute
 */
router.post(
  '/goals',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many goal update requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to set reading goals
    const { booksPerYear, pagesPerDay, minutesPerDay } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Goal setting not implemented yet',
      data: {
        booksPerYear,
        pagesPerDay,
        minutesPerDay
      }
    });
  }
);

/**
 * @route   GET /api/reading/achievements
 * @desc    Get reading achievements and badges
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

// ========== READING ANALYTICS & INSIGHTS ==========

/**
 * @route   GET /api/reading/analytics/daily
 * @desc    Get daily reading analytics
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/analytics/daily',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many analytics requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get daily analytics
    const { days = 30 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Daily analytics endpoint not implemented yet',
      data: {
        days: parseInt(days)
      }
    });
  }
);

/**
 * @route   GET /api/reading/analytics/patterns
 * @desc    Get reading patterns and habits
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/analytics/patterns',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many pattern requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get reading patterns
    res.status(501).json({
      success: false,
      message: 'Reading patterns endpoint not implemented yet'
    });
  }
);

/**
 * @route   GET /api/reading/analytics/genres
 * @desc    Get reading statistics by genre
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/analytics/genres',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many genre analytics requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get genre statistics
    res.status(501).json({
      success: false,
      message: 'Genre analytics endpoint not implemented yet'
    });
  }
);

// ========== BOOKMARKS & HIGHLIGHTS ==========

/**
 * @route   POST /api/reading/bookmarks
 * @desc    Add a bookmark
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/bookmarks',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many bookmark requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to add bookmarks
    const { sessionId, page, note } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Bookmark functionality not implemented yet',
      data: {
        sessionId,
        page,
        note
      }
    });
  }
);

/**
 * @route   GET /api/reading/sessions/:sessionId/bookmarks
 * @desc    Get bookmarks for a reading session
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/sessions/:sessionId/bookmarks',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many bookmark requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get bookmarks
    const { sessionId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Bookmark retrieval not implemented yet',
      data: {
        sessionId
      }
    });
  }
);

/**
 * @route   POST /api/reading/highlights
 * @desc    Add a highlight
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/highlights',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many highlight requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to add highlights
    const { sessionId, page, text, color, note } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Highlight functionality not implemented yet',
      data: {
        sessionId,
        page,
        text,
        color
      }
    });
  }
);

/**
 * @route   GET /api/reading/sessions/:sessionId/highlights
 * @desc    Get highlights for a reading session
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/sessions/:sessionId/highlights',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many highlight requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get highlights
    const { sessionId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Highlight retrieval not implemented yet',
      data: {
        sessionId
      }
    });
  }
);

// ========== READING REMINDERS & NOTIFICATIONS ==========

/**
 * @route   GET /api/reading/reminders
 * @desc    Get reading reminders
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/reminders',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many reminder requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get reading reminders
    res.status(501).json({
      success: false,
      message: 'Reading reminders endpoint not implemented yet'
    });
  }
);

/**
 * @route   POST /api/reading/reminders
 * @desc    Set reading reminder
 * @access  Private
 * @rateLimit 20 requests per minute
 */
router.post(
  '/reminders',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many reminder creation requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to set reminders
    const { time, days, enabled, bookId } = req.body;
    
    res.status(501).json({
      success: false,
      message: 'Reminder setting not implemented yet',
      data: {
        time,
        days,
        enabled,
        bookId
      }
    });
  }
);

// ========== READING CHALLENGES ==========

/**
 * @route   GET /api/reading/challenges
 * @desc    Get reading challenges
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/challenges',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many challenge requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get reading challenges
    res.status(501).json({
      success: false,
      message: 'Reading challenges endpoint not implemented yet'
    });
  }
);

/**
 * @route   POST /api/reading/challenges/:challengeId/join
 * @desc    Join a reading challenge
 * @access  Private
 * @rateLimit 20 requests per minute
 */
router.post(
  '/challenges/:challengeId/join',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many challenge join requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to join challenges
    const { challengeId } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Challenge joining not implemented yet',
      data: {
        challengeId
      }
    });
  }
);

// ========== READING STREAKS ==========

/**
 * @route   GET /api/reading/streak
 * @desc    Get current reading streak
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/streak',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many streak requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get reading streak
    res.status(501).json({
      success: false,
      message: 'Reading streak endpoint not implemented yet'
    });
  }
);

/**
 * @route   GET /api/reading/streak/history
 * @desc    Get reading streak history
 * @access  Private
 * @rateLimit 60 requests per minute
 */
router.get(
  '/streak/history',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many streak history requests, please try again later.'
  }),
  auth,
  (req, res) => {
    // This would be implemented to get streak history
    const { days = 30 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Streak history endpoint not implemented yet',
      data: {
        days: parseInt(days)
      }
    });
  }
);

// ========== HEALTH CHECK & METADATA ==========

/**
 * @route   GET /api/reading/health
 * @desc    Reading service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Reading service is healthy',
    timestamp: new Date().toISOString(),
    service: 'BookifyMe Reading API',
    version: '1.0.0'
  });
});

/**
 * @route   GET /api/reading/metadata
 * @desc    Get reading API metadata and available endpoints
 * @access  Public
 */
router.get('/metadata', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'BookifyMe Reading API',
      version: '1.0.0',
      description: 'Comprehensive reading tracking and analytics API',
      features: [
        'Reading session management (start, pause, resume, complete)',
        'Real-time progress tracking',
        'Reading statistics and analytics',
        'Notes, bookmarks, and highlights',
        'Reading goals and achievements',
        'Reading patterns and insights',
        'Streak tracking and reminders'
      ],
      endpoints: {
        sessionManagement: [
          'POST /api/reading/sessions/start',
          'PUT /api/reading/sessions/update',
          'PUT /api/reading/sessions/pause',
          'PUT /api/reading/sessions/resume',
          'POST /api/reading/sessions/complete',
          'GET /api/reading/sessions/current'
        ],
        historyAndAnalytics: [
          'GET /api/reading/history',
          'GET /api/reading/statistics',
          'GET /api/reading/analytics/daily',
          'GET /api/reading/analytics/patterns',
          'GET /api/reading/analytics/genres'
        ],
        notesAndAnnotations: [
          'POST /api/reading/notes',
          'GET /api/reading/sessions/:sessionId/notes',
          'POST /api/reading/bookmarks',
          'GET /api/reading/sessions/:sessionId/bookmarks',
          'POST /api/reading/highlights',
          'GET /api/reading/sessions/:sessionId/highlights'
        ],
        goalsAndChallenges: [
          'GET /api/reading/goals',
          'POST /api/reading/goals',
          'GET /api/reading/achievements',
          'GET /api/reading/challenges',
          'POST /api/reading/challenges/:challengeId/join'
        ]
      },
      rateLimiting: {
        sessionStart: '30 requests per minute',
        progressUpdate: '60 requests per minute',
        sessionCompletion: '20 requests per minute',
        history: '60 requests per minute',
        notes: '30 requests per minute'
      }
    }
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for reading routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Reading route not found: ${req.originalUrl}`,
    code: 'READING_ROUTE_NOT_FOUND',
    availableEndpoints: [
      '/api/reading/sessions/start',
      '/api/reading/sessions/update',
      '/api/reading/sessions/pause',
      '/api/reading/sessions/resume',
      '/api/reading/sessions/complete',
      '/api/reading/sessions/current',
      '/api/reading/history',
      '/api/reading/statistics',
      '/api/reading/notes',
      '/api/reading/goals'
    ]
  });
});

// Error handling middleware for reading routes
router.use((error, req, res, next) => {
  console.error('❌ Reading route error:', error);

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

  // Handle session not found errors
  if (error.message?.includes('not found') || error.kind === 'ObjectId') {
    return res.status(404).json({
      success: false,
      message: 'Reading session not found',
      code: 'SESSION_NOT_FOUND'
    });
  }

  // Handle book not found errors
  if (error.message?.includes('Book not found')) {
    return res.status(404).json({
      success: false,
      message: error.message,
      code: 'BOOK_NOT_FOUND'
    });
  }

  // Handle session already completed errors
  if (error.message?.includes('already completed')) {
    return res.status(409).json({
      success: false,
      message: error.message,
      code: 'SESSION_ALREADY_COMPLETED'
    });
  }

  // Handle invalid session state errors
  if (error.message?.includes('Only active sessions') || error.message?.includes('Only paused sessions')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_SESSION_STATE'
    });
  }

  // Handle progress validation errors
  if (error.message?.includes('progress') || error.message?.includes('page')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'INVALID_PROGRESS'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    code: 'READING_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;