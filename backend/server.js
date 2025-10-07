import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import dotenv from 'dotenv';

// Import database configuration
import database from './config/database.js';

// Import middleware
import { auth, optionalAuth, authLogger, authSecurityHeaders } from './middleware/auth.js';
import { sanitizeInput, handleValidationErrors } from './middleware/validation.js';

// Import controllers
import authController from './controllers/authController.js';
import bookController from './controllers/bookController.js';
import communityController from './controllers/communityController.js';
import readingController from './controllers/readingController.js';
import userController from './controllers/userController.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========== DATABASE CONNECTION ==========

// Initialize database connection
database.connect().catch(error => {
  console.error('❌ Failed to connect to database:', error);
  process.exit(1);
});

// ========== SECURITY MIDDLEWARE ==========

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'development' ? 1000 : 100, // requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// More aggressive rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ========== GENERAL MIDDLEWARE ==========

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'page', 'limit', 'sort', 'search', 'genre', 'author', 
    'language', 'orderBy', 'printType', 'maxResults'
  ]
}));

// Compression
app.use(compression());

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400 // Only log errors in production
  }));
}

// Security headers for specific routes
app.use('/api/auth', authSecurityHeaders);

// ========== REQUEST LOGGING & SANITIZATION ==========

app.use(authLogger);
app.use(sanitizeInput);

// ========== HEALTH CHECK & STATUS ROUTES ==========

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '📚 BookifyMe API Server is running!',
    data: {
      service: 'BookifyMe Backend API',
      version: '1.0.0',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      documentation: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/api-docs` : 'Available at /api/docs'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await database.healthCheck();
    
    res.status(200).json({
      success: true,
      message: '✅ Service is healthy',
      data: {
        server: {
          status: 'healthy',
          environment: NODE_ENV,
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        },
        database: dbStatus,
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: '❌ Service is unhealthy',
      error: {
        database: (await database.healthCheck()).status,
        server: 'error'
      }
    });
  }
});

app.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: database.getConnectionStatus()
  });
});

// ========== API ROUTES ==========

// ===== AUTHENTICATION ROUTES =====
app.post('/api/auth/register', handleValidationErrors, authController.register);
app.post('/api/auth/login', handleValidationErrors, authController.login);
app.post('/api/auth/logout', auth, authController.logout);
app.get('/api/auth/profile', auth, authController.getProfile);
app.put('/api/auth/profile', auth, handleValidationErrors, authController.updateProfile);
app.put('/api/auth/change-password', auth, handleValidationErrors, authController.changePassword);
app.post('/api/auth/refresh-token', authController.refreshToken);
app.get('/api/auth/check-username/:username', authController.checkUsernameAvailability);
app.get('/api/auth/verify', auth, authController.verifyToken);

// ===== BOOK ROUTES =====
app.get('/api/books/search', optionalAuth, bookController.searchBooks);
app.get('/api/books/:id', optionalAuth, bookController.getBookById);
app.get('/api/books/genre/:genre', optionalAuth, bookController.getBooksByGenre);
app.get('/api/books/trending', optionalAuth, bookController.getTrendingBooks);
app.get('/api/books/new-releases', optionalAuth, bookController.getNewReleases);
app.get('/api/books/recommendations', auth, bookController.getRecommendations);
app.post('/api/books/:id/reviews', auth, bookController.addBookReview);
app.get('/api/books/:id/reviews', optionalAuth, bookController.getBookReviews);

// ===== COMMUNITY ROUTES =====
app.post('/api/communities', auth, communityController.createCommunity);
app.get('/api/communities', optionalAuth, communityController.getCommunities);
app.get('/api/communities/:id', optionalAuth, communityController.getCommunityById);
app.post('/api/communities/:id/join', auth, communityController.joinCommunity);
app.post('/api/communities/:id/leave', auth, communityController.leaveCommunity);
app.post('/api/communities/:id/discussions', auth, communityController.createDiscussion);
app.get('/api/communities/:id/discussions', optionalAuth, communityController.getDiscussions);
app.post('/api/communities/:id/discussions/:discussionId/like', auth, communityController.toggleDiscussionLike);
app.post('/api/communities/:id/discussions/:discussionId/comments', auth, communityController.addComment);
app.put('/api/communities/:id/current-book', auth, communityController.setCurrentBook);
app.get('/api/communities/:id/statistics', optionalAuth, communityController.getCommunityStats);
app.get('/api/communities/user/joined', auth, communityController.getUserCommunities);

// ===== READING ROUTES =====
app.post('/api/reading/sessions/start', auth, readingController.startReadingSession);
app.put('/api/reading/sessions/update', auth, readingController.updateReadingProgress);
app.put('/api/reading/sessions/pause', auth, readingController.pauseReadingSession);
app.put('/api/reading/sessions/resume', auth, readingController.resumeReadingSession);
app.post('/api/reading/sessions/complete', auth, readingController.completeReadingSession);
app.get('/api/reading/sessions/current', auth, readingController.getCurrentSessions);
app.get('/api/reading/history', auth, readingController.getReadingHistory);
app.get('/api/reading/statistics', auth, readingController.getReadingStatistics);
app.post('/api/reading/notes', auth, readingController.addReadingNote);
app.get('/api/reading/sessions/:sessionId/notes', auth, readingController.getReadingNotes);

// ===== USER ROUTES =====
app.get('/api/users/:identifier', optionalAuth, userController.getUserProfile);
app.put('/api/users/profile', auth, userController.updateUserProfile);
app.post('/api/users/bookshelf', auth, userController.addToBookshelf);
app.delete('/api/users/bookshelf', auth, userController.removeFromBookshelf);
app.get('/api/users/bookshelf/:shelfType?', auth, userController.getBookshelf);
app.put('/api/users/reading-progress', auth, userController.updateReadingProgress);
app.get('/api/users/statistics', auth, userController.getUserStatistics);
app.put('/api/users/reading-goals', auth, userController.updateReadingGoals);
app.get('/api/users/search', optionalAuth, userController.searchUsers);
app.delete('/api/users/account', auth, userController.deleteAccount);

// ========== ERROR HANDLING MIDDLEWARE ==========

// 404 Handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `🔍 Route not found: ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
    suggestion: 'Check the API documentation for available endpoints'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Global Error Handler:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
      code: 'VALIDATION_ERROR'
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate field value: ${field}. Please use another value.`,
      field: field,
      code: 'DUPLICATE_FIELD'
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format: ${error.value}`,
      code: 'INVALID_ID_FORMAT'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please log in again.',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default error
  const statusCode = error.statusCode || error.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    code: error.code || 'INTERNAL_SERVER_ERROR',
    ...(NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ========== GRACEFUL SHUTDOWN ==========

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  
  try {
    await database.close();
    console.log('✅ Database connection closed.');
    
    server.close(() => {
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing shutdown after timeout...');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM received. Shutting down gracefully...');
  
  try {
    await database.close();
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Close server & exit process
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// ========== SERVER STARTUP ==========

const server = app.listen(PORT, () => {
  console.log(`
✨ BookifyMe Server Started Successfully!

📚 Service: BookifyMe Backend API
🚀 Environment: ${NODE_ENV}
📍 Server: http://localhost:${PORT}
🕐 Time: ${new Date().toISOString()}
📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}

📋 Available Endpoints:
   📖 Books API: http://localhost:${PORT}/api/books
   👥 Communities: http://localhost:${PORT}/api/communities  
   📚 Reading: http://localhost:${PORT}/api/reading
   👤 Users: http://localhost:${PORT}/api/users
   🔐 Auth: http://localhost:${PORT}/api/auth

❤️  Health Check: http://localhost:${PORT}/health
📊 Status: http://localhost:${PORT}/status

-----------------------------------------
  `);
});

export default app;