import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation Middleware
 * Handles input validation and sanitization for all incoming requests
 */

/**
 * @desc    Handle validation errors and send formatted response
 * @middleware
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    // Check if it's a validation error (400) or param error (404)
    const hasParamErrors = errors.array().some(error => error.location === 'params');
    
    return res.status(hasParamErrors ? 404 : 400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

/**
 * @desc    Sanitize input data to prevent XSS and injection attacks
 * @middleware
 */
export const sanitizeInput = [
  body('*').escape(), // Escape HTML in all body fields
  body('*.email').normalizeEmail(), // Normalize email addresses
  (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].trim();
        }
      });
    }
    
    // Sanitize body parameters
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    
    next();
  }
];

// ========== AUTHENTICATION VALIDATION RULES ==========

/**
 * @desc    Validation rules for user registration
 */
export const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .isLength({ max: 128 })
    .withMessage('Password must not exceed 128 characters'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('favoriteGenres')
    .optional()
    .isArray()
    .withMessage('Favorite genres must be an array')
    .custom((genres) => {
      if (genres && genres.length > 10) {
        throw new Error('Cannot select more than 10 favorite genres');
      }
      return true;
    }),

  body('favoriteAuthors')
    .optional()
    .isArray()
    .withMessage('Favorite authors must be an array')
    .custom((authors) => {
      if (authors && authors.length > 10) {
        throw new Error('Cannot select more than 10 favorite authors');
      }
      return true;
    })
];

/**
 * @desc    Validation rules for user login
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * @desc    Validation rules for updating user profile
 */
export const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),

  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),

  body('favoriteGenres')
    .optional()
    .isArray()
    .withMessage('Favorite genres must be an array')
    .custom((genres) => {
      if (genres && genres.length > 10) {
        throw new Error('Cannot select more than 10 favorite genres');
      }
      return true;
    }),

  body('favoriteAuthors')
    .optional()
    .isArray()
    .withMessage('Favorite authors must be an array')
    .custom((authors) => {
      if (authors && authors.length > 10) {
        throw new Error('Cannot select more than 10 favorite authors');
      }
      return true;
    }),

  body('readingGoals.booksPerYear')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Books per year must be between 1 and 1000'),

  body('readingGoals.pagesPerDay')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Pages per day must be between 1 and 500')
];

/**
 * @desc    Validation rules for changing password
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((newPassword, { req }) => {
      if (newPassword === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// ========== BOOK VALIDATION RULES ==========

/**
 * @desc    Validation rules for book search
 */
export const validateBookSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search query must be between 1 and 255 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('genre')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Genre must be between 1 and 50 characters'),

  query('author')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author must be between 1 and 100 characters'),

  query('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a 2-5 character code'),

  query('orderBy')
    .optional()
    .isIn(['relevance', 'newest', 'rating'])
    .withMessage('Order by must be one of: relevance, newest, rating'),

  query('printType')
    .optional()
    .isIn(['all', 'books', 'magazines'])
    .withMessage('Print type must be one of: all, books, magazines')
];

/**
 * @desc    Validation rules for book reviews
 */
export const validateBookReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),

  body('comment')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review comment must be between 10 and 2000 characters'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Review title must not exceed 200 characters')
];

/**
 * @desc    Validation rules for book ID parameters
 */
export const validateBookId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid book ID format')
];

// ========== READING SESSION VALIDATION RULES ==========

/**
 * @desc    Validation rules for starting reading session
 */
export const validateStartReadingSession = [
  body('bookId')
    .isMongoId()
    .withMessage('Invalid book ID format'),

  body('startPage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Start page must be a non-negative integer')
    .toInt()
];

/**
 * @desc    Validation rules for updating reading progress
 */
export const validateReadingProgress = [
  body('sessionId')
    .isMongoId()
    .withMessage('Invalid session ID format'),

  body('currentPage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current page must be a non-negative integer')
    .toInt(),

  body('pagesRead')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pages read must be a non-negative integer')
    .toInt(),

  body('readingTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reading time must be a non-negative integer (seconds)')
    .toInt(),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Note must not exceed 1000 characters')
];

/**
 * @desc    Validation rules for completing reading session
 */
export const validateCompleteReadingSession = [
  body('sessionId')
    .isMongoId()
    .withMessage('Invalid session ID format'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),

  body('review')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Review must not exceed 2000 characters')
];

// ========== COMMUNITY VALIDATION RULES ==========

/**
 * @desc    Validation rules for creating community
 */
export const validateCreateCommunity = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Community name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Community name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Community description must be between 10 and 500 characters'),

  body('genre')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Genre must be between 1 and 50 characters'),

  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
    .toBoolean(),

  body('maxMembers')
    .optional()
    .isInt({ min: 2, max: 1000 })
    .withMessage('Maximum members must be between 2 and 1000')
    .toInt(),

  body('rules')
    .optional()
    .isArray()
    .withMessage('Rules must be an array'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Cannot add more than 10 tags');
      }
      return true;
    })
];

/**
 * @desc    Validation rules for community discussions
 */
export const validateCommunityDiscussion = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Discussion content must be between 1 and 5000 characters'),

  body('type')
    .optional()
    .isIn(['discussion', 'question', 'announcement', 'review'])
    .withMessage('Discussion type must be one of: discussion, question, announcement, review'),

  body('bookId')
    .optional()
    .isMongoId()
    .withMessage('Invalid book ID format')
];

/**
 * @desc    Validation rules for community comments
 */
export const validateCommunityComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

/**
 * @desc    Validation rules for community ID parameters
 */
export const validateCommunityId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid community ID format')
];

// ========== USER BOOKSHELF VALIDATION RULES ==========

/**
 * @desc    Validation rules for bookshelf operations
 */
export const validateBookshelfOperation = [
  body('bookId')
    .isMongoId()
    .withMessage('Invalid book ID format'),

  body('shelfType')
    .isIn(['currentlyReading', 'wantToRead', 'finished'])
    .withMessage('Shelf type must be one of: currentlyReading, wantToRead, finished')
];

/**
 * @desc    Validation rules for reading progress update
 */
export const validateUserReadingProgress = [
  body('bookId')
    .isMongoId()
    .withMessage('Invalid book ID format'),

  body('currentPage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current page must be a non-negative integer')
    .toInt(),

  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100 percent')
    .toInt()
];

/**
 * @desc    Validation rules for reading goals
 */
export const validateReadingGoals = [
  body('booksPerYear')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Books per year must be between 1 and 1000')
    .toInt(),

  body('pagesPerDay')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Pages per day must be between 1 and 500')
    .toInt()
];

// ========== PAGINATION VALIDATION RULES ==========

/**
 * @desc    Common validation rules for pagination
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sort by field must be between 1 and 50 characters'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"')
];

// ========== FILE UPLOAD VALIDATION RULES ==========

/**
 * @desc    Validation rules for file uploads (avatars, etc.)
 */
export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File size must be less than 5MB',
      code: 'FILE_TOO_LARGE'
    });
  }

  // Check file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'File must be an image (JPEG, PNG, GIF, or WebP)',
      code: 'INVALID_FILE_TYPE'
    });
  }

  next();
};

// ========== CUSTOM VALIDATORS ==========

/**
 * @desc    Custom validator for MongoDB ObjectId
 */
export const isObjectId = (value) => {
  if (!value) return false;
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(value);
};

/**
 * @desc    Custom validator for date strings
 */
export const isDateString = (value) => {
  if (!value) return true; // Optional field
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * @desc    Custom validator for ISBN numbers
 */
export const isISBN = (value) => {
  if (!value) return true; // Optional field
  
  // Remove hyphens and spaces
  const cleanISBN = value.replace(/[-\s]/g, '');
  
  // Check if it's ISBN-10 or ISBN-13
  if (cleanISBN.length === 10) {
    const isbn10Pattern = /^\d{9}[\dX]$/;
    return isbn10Pattern.test(cleanISBN);
  } else if (cleanISBN.length === 13) {
    const isbn13Pattern = /^\d{13}$/;
    return isbn13Pattern.test(cleanISBN);
  }
  
  return false;
};

/**
 * @desc    Custom validator for price values
 */
export const isPrice = (value) => {
  if (value === undefined || value === null) return true;
  const price = parseFloat(value);
  return !isNaN(price) && price >= 0 && price <= 10000;
};

// ========== VALIDATION GROUPS ==========

/**
 * @desc    Validation group for authentication routes
 */
export const authValidations = {
  register: [...validateRegistration, handleValidationErrors],
  login: [...validateLogin, handleValidationErrors],
  profileUpdate: [...validateProfileUpdate, handleValidationErrors],
  passwordChange: [...validatePasswordChange, handleValidationErrors]
};

/**
 * @desc    Validation group for book routes
 */
export const bookValidations = {
  search: [...validateBookSearch, handleValidationErrors],
  review: [...validateBookReview, handleValidationErrors],
  bookId: [...validateBookId, handleValidationErrors]
};

/**
 * @desc    Validation group for reading routes
 */
export const readingValidations = {
  startSession: [...validateStartReadingSession, handleValidationErrors],
  updateProgress: [...validateReadingProgress, handleValidationErrors],
  completeSession: [...validateCompleteReadingSession, handleValidationErrors]
};

/**
 * @desc    Validation group for community routes
 */
export const communityValidations = {
  create: [...validateCreateCommunity, handleValidationErrors],
  discussion: [...validateCommunityDiscussion, handleValidationErrors],
  comment: [...validateCommunityComment, handleValidationErrors],
  communityId: [...validateCommunityId, handleValidationErrors]
};

/**
 * @desc    Validation group for user routes
 */
export const userValidations = {
  bookshelf: [...validateBookshelfOperation, handleValidationErrors],
  readingProgress: [...validateUserReadingProgress, handleValidationErrors],
  readingGoals: [...validateReadingGoals, handleValidationErrors],
  pagination: [...validatePagination, handleValidationErrors]
};

export default {
  // Core middleware
  handleValidationErrors,
  sanitizeInput,
  
  // Authentication
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  
  // Books
  validateBookSearch,
  validateBookReview,
  validateBookId,
  
  // Reading
  validateStartReadingSession,
  validateReadingProgress,
  validateCompleteReadingSession,
  
  // Community
  validateCreateCommunity,
  validateCommunityDiscussion,
  validateCommunityComment,
  validateCommunityId,
  
  // User
  validateBookshelfOperation,
  validateUserReadingProgress,
  validateReadingGoals,
  validatePagination,
  
  // File upload
  validateFileUpload,
  
  // Custom validators
  isObjectId,
  isDateString,
  isISBN,
  isPrice,
  
  // Validation groups
  authValidations,
  bookValidations,
  readingValidations,
  communityValidations,
  userValidations
};