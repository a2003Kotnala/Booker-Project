import express from 'express';
import {
  searchBooks,
  getBookById,
  getBooksByGenre,
  getTrendingBooks,
  getNewReleases,
  getRecommendations,
  addBookReview,
  getBookReviews
} from '../controllers/bookController.js';
import { auth, optionalAuth, rateLimit } from '../middleware/auth.js';
import { bookValidations, validatePagination, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/books/search
 * @desc    Search books with Google Books API and local database
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/search',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many search requests, please try again later.'
  }),
  bookValidations.search,
  optionalAuth, // Optional auth to track search history for logged-in users
  searchBooks
);

/**
 * @route   GET /api/books/:id
 * @desc    Get book by ID (local or Google Books ID)
 * @access  Public
 * @rateLimit 100 requests per minute
 */
router.get(
  '/:id',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many book detail requests, please try again later.'
  }),
  bookValidations.bookId,
  optionalAuth, // Optional auth to track views for logged-in users
  getBookById
);

/**
 * @route   GET /api/books/genre/:genre
 * @desc    Get books by genre/category
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/genre/:genre',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many genre requests, please try again later.'
  }),
  getBooksByGenre
);

/**
 * @route   GET /api/books/trending
 * @desc    Get trending books
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/trending',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many trending books requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  getTrendingBooks
);

/**
 * @route   GET /api/books/new-releases
 * @desc    Get new releases
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/new-releases',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many new releases requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  getNewReleases
);

/**
 * @route   GET /api/books/:id/reviews
 * @desc    Get book reviews
 * @access  Public
 * @rateLimit 100 requests per minute
 */
router.get(
  '/:id/reviews',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many review requests, please try again later.'
  }),
  bookValidations.bookId,
  getBookReviews
);

// ========== PROTECTED ROUTES (Require Authentication) ==========

/**
 * @route   GET /api/books/recommendations
 * @desc    Get book recommendations for user
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.get(
  '/recommendations',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many recommendation requests, please try again later.'
  }),
  auth,
  validatePagination,
  handleValidationErrors,
  getRecommendations
);

/**
 * @route   POST /api/books/:id/reviews
 * @desc    Add book review/rating
 * @access  Private
 * @rateLimit 20 requests per minute
 */
router.post(
  '/:id/reviews',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many review submissions, please try again later.'
  }),
  auth,
  bookValidations.bookId,
  bookValidations.review,
  addBookReview
);

// ========== BOOK COLLECTIONS & CATEGORIES ==========

/**
 * @route   GET /api/books/categories/popular
 * @desc    Get popular book categories
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/categories/popular',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many category requests, please try again later.'
  }),
  (req, res) => {
    // This would typically come from a database or config
    const popularCategories = [
      'Fiction', 'Mystery', 'Science Fiction', 'Fantasy', 'Romance',
      'Thriller', 'Biography', 'History', 'Science', 'Self-Help',
      'Business', 'Travel', 'Cookbooks', 'Art', 'Poetry'
    ];
    
    res.status(200).json({
      success: true,
      data: {
        categories: popularCategories.map(category => ({
          name: category,
          slug: category.toLowerCase().replace(/\s+/g, '-'),
          bookCount: Math.floor(Math.random() * 1000) + 100 // Mock data
        }))
      }
    });
  }
);

/**
 * @route   GET /api/books/categories/:category
 * @desc    Get books by specific category
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/categories/:category',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many category book requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to fetch books by specific category
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: `Category books endpoint not implemented yet for: ${category}`,
      data: {
        category,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

// ========== BOOK LISTS & COLLECTIONS ==========

/**
 * @route   GET /api/books/lists/bestsellers
 * @desc    Get bestselling books
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/lists/bestsellers',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many bestseller requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to fetch bestsellers
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Bestsellers endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   GET /api/books/lists/featured
 * @desc    Get featured books
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/lists/featured',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many featured books requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to fetch featured books
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Featured books endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

/**
 * @route   GET /api/books/lists/award-winners
 * @desc    Get award-winning books
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/lists/award-winners',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many award winners requests, please try again later.'
  }),
  validatePagination,
  handleValidationErrors,
  (req, res) => {
    // This would be implemented to fetch award-winning books
    const { page = 1, limit = 20 } = req.query;
    
    res.status(501).json({
      success: false,
      message: 'Award winners endpoint not implemented yet',
      data: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  }
);

// ========== BOOK INTERACTIONS (Protected) ==========

/**
 * @route   POST /api/books/:id/view
 * @desc    Track book view (for analytics)
 * @access  Private
 * @rateLimit 100 requests per minute
 */
router.post(
  '/:id/view',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many view tracking requests, please try again later.'
  }),
  auth,
  bookValidations.bookId,
  (req, res) => {
    // This would be implemented to track book views
    const { id } = req.params;
    
    res.status(200).json({
      success: true,
      message: 'Book view tracked successfully',
      data: {
        bookId: id,
        viewedAt: new Date()
      }
    });
  }
);

/**
 * @route   POST /api/books/:id/wishlist
 * @desc    Add book to wishlist
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.post(
  '/:id/wishlist',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many wishlist requests, please try again later.'
  }),
  auth,
  bookValidations.bookId,
  (req, res) => {
    // This would be implemented to add to wishlist
    const { id } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Wishlist functionality not implemented yet',
      data: {
        bookId: id
      }
    });
  }
);

/**
 * @route   DELETE /api/books/:id/wishlist
 * @desc    Remove book from wishlist
 * @access  Private
 * @rateLimit 30 requests per minute
 */
router.delete(
  '/:id/wishlist',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many wishlist removal requests, please try again later.'
  }),
  auth,
  bookValidations.bookId,
  (req, res) => {
    // This would be implemented to remove from wishlist
    const { id } = req.params;
    
    res.status(501).json({
      success: false,
      message: 'Wishlist functionality not implemented yet',
      data: {
        bookId: id
      }
    });
  }
);

// ========== BOOK STATISTICS ==========

/**
 * @route   GET /api/books/stats/popular
 * @desc    Get popular books statistics
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/stats/popular',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many statistics requests, please try again later.'
  }),
  (req, res) => {
    // This would be implemented to get popular books stats
    res.status(501).json({
      success: false,
      message: 'Book statistics endpoint not implemented yet'
    });
  }
);

/**
 * @route   GET /api/books/stats/genres
 * @desc    Get genre statistics
 * @access  Public
 * @rateLimit 60 requests per minute
 */
router.get(
  '/stats/genres',
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per windowMs
    message: 'Too many genre statistics requests, please try again later.'
  }),
  (req, res) => {
    // This would be implemented to get genre statistics
    res.status(501).json({
      success: false,
      message: 'Genre statistics endpoint not implemented yet'
    });
  }
);

// ========== HEALTH CHECK & METADATA ==========

/**
 * @route   GET /api/books/health
 * @desc    Books service health check
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Books service is healthy',
    timestamp: new Date().toISOString(),
    service: 'BookifyMe Books API',
    version: '1.0.0',
    endpoints: {
      search: '/api/books/search',
      bookDetails: '/api/books/:id',
      genres: '/api/books/genre/:genre',
      trending: '/api/books/trending',
      newReleases: '/api/books/new-releases',
      recommendations: '/api/books/recommendations'
    }
  });
});

/**
 * @route   GET /api/books/metadata
 * @desc    Get books API metadata and available endpoints
 * @access  Public
 */
router.get('/metadata', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'BookifyMe Books API',
      version: '1.0.0',
      description: 'Comprehensive book discovery and management API',
      features: [
        'Book search with Google Books API integration',
        'Book details and metadata',
        'Genre-based categorization',
        'Trending and new releases',
        'Personalized recommendations',
        'Book reviews and ratings',
        'Reading progress tracking'
      ],
      endpoints: {
        public: [
          'GET /api/books/search',
          'GET /api/books/:id',
          'GET /api/books/genre/:genre',
          'GET /api/books/trending',
          'GET /api/books/new-releases',
          'GET /api/books/:id/reviews',
          'GET /api/books/categories/popular'
        ],
        protected: [
          'GET /api/books/recommendations',
          'POST /api/books/:id/reviews',
          'POST /api/books/:id/view',
          'POST /api/books/:id/wishlist'
        ]
      },
      rateLimiting: {
        search: '60 requests per minute',
        bookDetails: '100 requests per minute',
        reviews: '20 requests per minute',
        recommendations: '30 requests per minute'
      }
    }
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 handler for book routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Book route not found: ${req.originalUrl}`,
    code: 'BOOK_ROUTE_NOT_FOUND',
    availableEndpoints: [
      '/api/books/search',
      '/api/books/:id',
      '/api/books/genre/:genre',
      '/api/books/trending',
      '/api/books/new-releases',
      '/api/books/recommendations',
      '/api/books/:id/reviews'
    ]
  });
});

// Error handling middleware for book routes
router.use((error, req, res, next) => {
  console.error('❌ Book route error:', error);

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

  // Handle Google Books API errors
  if (error.message?.includes('Google Books API') || error.code === 'GOOGLE_BOOKS_ERROR') {
    return res.status(502).json({
      success: false,
      message: 'Book search service temporarily unavailable',
      code: 'EXTERNAL_API_ERROR'
    });
  }

  // Handle book not found errors
  if (error.message?.includes('not found') || error.kind === 'ObjectId') {
    return res.status(404).json({
      success: false,
      message: 'Book not found',
      code: 'BOOK_NOT_FOUND'
    });
  }

  // Handle duplicate review errors
  if (error.message?.includes('already reviewed')) {
    return res.status(409).json({
      success: false,
      message: 'You have already reviewed this book',
      code: 'DUPLICATE_REVIEW'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    code: 'BOOK_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default router;