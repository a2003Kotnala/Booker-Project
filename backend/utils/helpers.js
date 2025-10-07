// backend/utils/helpers.js

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Utility Functions for BookifyMe Backend
 * Contains helper functions for common operations across the application
 */

// ========== ERROR HANDLING UTILITIES ==========

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode, errorCode = 'APP_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle async errors in Express routes
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Format error response for consistent error handling
 */
export const formatErrorResponse = (error, includeStack = false) => {
  const response = {
    success: false,
    message: error.message,
    code: error.errorCode || 'INTERNAL_ERROR',
    timestamp: error.timestamp || new Date().toISOString()
  };

  if (error.details) {
    response.details = error.details;
  }

  if (includeStack && process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return response;
};

// ========== VALIDATION UTILITIES ==========

/**
 * Validate MongoDB ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && 
         (new mongoose.Types.ObjectId(id)).toString() === id;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
};

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Trim and normalize string inputs
 */
export const normalizeString = (str, maxLength = null) => {
  if (typeof str !== 'string') return str;
  
  let normalized = str.trim().replace(/\s+/g, ' ');
  
  if (maxLength && normalized.length > maxLength) {
    normalized = normalized.substring(0, maxLength);
  }
  
  return normalized;
};

// ========== STRING MANIPULATION UTILITIES ==========

/**
 * Generate a random string of specified length
 */
export const generateRandomString = (length = 10) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

/**
 * Generate a unique filename with timestamp and random string
 */
export const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = generateRandomString(8);
  const extension = originalName.split('.').pop();
  
  return `${prefix}${timestamp}_${randomString}.${extension}`;
};

/**
 * Truncate text to specified length with ellipsis
 */
export const truncateText = (text, maxLength, addEllipsis = true) => {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength).trim();
  return addEllipsis ? `${truncated}...` : truncated;
};

/**
 * Convert string to URL-friendly slug
 */
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

// ========== DATE & TIME UTILITIES ==========

/**
 * Format date to readable string
 */
export const formatDate = (date, format = 'medium') => {
  const dateObj = new Date(date);
  
  const options = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    medium: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  };
  
  return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
};

/**
 * Calculate reading time based on word count
 */
export const calculateReadingTime = (wordCount, wordsPerMinute = 200) => {
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  if (minutes < 1) return 'Less than a minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
};

/**
 * Format duration in seconds to readable format
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    if (remainingSeconds === 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};

// ========== ARRAY & OBJECT UTILITIES ==========

/**
 * Remove duplicates from array
 */
export const removeDuplicates = (array, key = null) => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Sort array by property
 */
export const sortByProperty = (array, property, order = 'asc') => {
  return [...array].sort((a, b) => {
    let aValue = a[property];
    let bValue = b[property];
    
    // Handle nested properties
    if (property.includes('.')) {
      aValue = property.split('.').reduce((obj, key) => obj?.[key], a);
      bValue = property.split('.').reduce((obj, key) => obj?.[key], b);
    }
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group array by property
 */
export const groupBy = (array, property) => {
  return array.reduce((groups, item) => {
    const key = item[property];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
};

/**
 * Paginate array
 */
export const paginateArray = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      current: page,
      pages: Math.ceil(array.length / limit),
      total: array.length,
      hasNext: endIndex < array.length,
      hasPrev: startIndex > 0
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Merge objects deeply
 */
export const deepMerge = (target, source) => {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
};

/**
 * Check if value is an object
 */
export const isObject = (value) => {
  return value && typeof value === 'object' && !Array.isArray(value);
};

// ========== NUMBER & MATH UTILITIES ==========

/**
 * Format number with commas (thousands separator)
 */
export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number);
};

/**
 * Generate random number in range
 */
export const randomInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value, total, decimalPlaces = 0) => {
  if (total === 0) return 0;
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimalPlaces));
};

/**
 * Clamp number between min and max
 */
export const clamp = (number, min, max) => {
  return Math.min(Math.max(number, min), max);
};

// ========== FILE & URL UTILITIES ==========

/**
 * Validate URL
 */
export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Extract domain from URL
 */
export const extractDomain = (url) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch (_) {
    return null;
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Validate file type by extension
 */
export const isValidFileType = (filename, allowedTypes) => {
  const extension = getFileExtension(filename).toLowerCase();
  return allowedTypes.includes(extension);
};

/**
 * Validate file size
 */
export const isValidFileSize = (fileSize, maxSizeInMB) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize <= maxSizeInBytes;
};

// ========== BOOK-SPECIFIC UTILITIES ==========

/**
 * Generate book cover placeholder URL
 */
export const generateBookCoverPlaceholder = (title, author, size = 'medium') => {
  const sizes = {
    small: '150x200',
    medium: '300x400',
    large: '450x600'
  };
  
  const dimensions = sizes[size] || sizes.medium;
  const text = encodeURIComponent(`${title.charAt(0)} - ${author?.charAt(0) || 'A'}`);
  
  return `https://placehold.co/${dimensions}/6a11cb/ffffff?text=${text}`;
};

/**
 * Extract ISBN from various formats
 */
export const normalizeISBN = (isbn) => {
  if (!isbn) return null;
  
  // Remove all non-alphanumeric characters except X (for ISBN-10)
  const cleanISBN = isbn.replace(/[^\dX]/gi, '').toUpperCase();
  
  // Validate ISBN length
  if (cleanISBN.length !== 10 && cleanISBN.length !== 13) {
    return null;
  }
  
  return cleanISBN;
};

/**
 * Calculate book progress percentage
 */
export const calculateBookProgress = (currentPage, totalPages) => {
  if (!totalPages || totalPages === 0) return 0;
  const progress = (currentPage / totalPages) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
};

/**
 * Estimate book completion time
 */
export const estimateCompletionTime = (currentPage, totalPages, readingSpeed = 1) => {
  const pagesRemaining = totalPages - currentPage;
  const estimatedMinutes = pagesRemaining / readingSpeed;
  
  if (estimatedMinutes < 60) {
    return `${Math.ceil(estimatedMinutes)} minutes`;
  }
  
  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = Math.ceil(estimatedMinutes % 60);
  
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minutes` : ''}`.trim();
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days} day${days > 1 ? 's' : ''} ${remainingHours > 0 ? `${remainingHours} hours` : ''}`.trim();
};

// ========== PAGINATION UTILITIES ==========

/**
 * Generate pagination metadata
 */
export const generatePagination = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    current: parseInt(page),
    pages: totalPages,
    total: total,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? parseInt(page) + 1 : null,
    prevPage: page > 1 ? parseInt(page) - 1 : null
  };
};

/**
 * Calculate database pagination skip and limit
 */
export const getPaginationParams = (page = 1, limit = 10, maxLimit = 100) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  
  return { skip, limit: limitNum, page: pageNum };
};

// ========== SEARCH & FILTER UTILITIES ==========

/**
 * Build MongoDB search query for text search
 */
export const buildSearchQuery = (searchFields, searchTerm) => {
  if (!searchTerm || !searchFields.length) return {};
  
  const searchRegex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
  
  if (searchFields.length === 1) {
    return { [searchFields[0]]: searchRegex };
  }
  
  const orConditions = searchFields.map(field => ({
    [field]: searchRegex
  }));
  
  return { $or: orConditions };
};

/**
 * Build MongoDB filter query from request query parameters
 */
export const buildFilterQuery = (query, filterMappings = {}) => {
  const filter = {};
  
  Object.keys(query).forEach(key => {
    if (filterMappings[key]) {
      const mapping = filterMappings[key];
      const value = query[key];
      
      if (mapping.type === 'boolean') {
        filter[mapping.field] = value === 'true';
      } else if (mapping.type === 'number') {
        filter[mapping.field] = parseInt(value);
      } else if (mapping.type === 'array') {
        filter[mapping.field] = { $in: value.split(',') };
      } else if (mapping.type === 'regex') {
        filter[mapping.field] = new RegExp(value, 'i');
      } else if (mapping.type === 'range') {
        const [min, max] = value.split('-').map(Number);
        if (!isNaN(min)) filter[mapping.field] = { ...filter[mapping.field], $gte: min };
        if (!isNaN(max)) filter[mapping.field] = { ...filter[mapping.field], $lte: max };
      } else {
        filter[mapping.field] = value;
      }
    }
  });
  
  return filter;
};

// ========== PERFORMANCE & LOGGING UTILITIES ==========

/**
 * Measure execution time of a function
 */
export const measureExecutionTime = async (fn, ...args) => {
  const start = process.hrtime();
  const result = await fn(...args);
  const end = process.hrtime(start);
  
  const executionTime = (end[0] * 1000 + end[1] / 1000000).toFixed(2);
  
  return {
    result,
    executionTime: `${executionTime}ms`
  };
};

/**
 * Generate request ID for tracking
 */
export const generateRequestId = () => {
  return `req_${Date.now()}_${generateRandomString(8)}`;
};

/**
 * Log performance metrics
 */
export const logPerformance = (operation, duration, additionalData = {}) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`⏱️  Performance - ${operation}: ${duration}`, additionalData);
  }
};

// ========== SECURITY UTILITIES ==========

/**
 * Generate secure random token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash data using SHA-256
 */
export const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data, fieldsToMask = ['password', 'token', 'authorization']) => {
  const masked = { ...data };
  
  fieldsToMask.forEach(field => {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  });
  
  return masked;
};

// ========== ENVIRONMENT UTILITIES ==========

/**
 * Check if running in production
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in development
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Get environment variable with fallback
 */
export const getEnv = (key, defaultValue = null) => {
  const value = process.env[key];
  if (value === undefined || value === null) {
    if (defaultValue === null) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }
  return value;
};

// ========== EXPORT ALL UTILITIES ==========

export default {
  // Error Handling
  AppError,
  catchAsync,
  formatErrorResponse,
  
  // Validation
  isValidObjectId,
  isValidEmail,
  isStrongPassword,
  sanitizeInput,
  normalizeString,
  
  // String Manipulation
  generateRandomString,
  generateUniqueFilename,
  truncateText,
  generateSlug,
  capitalizeWords,
  
  // Date & Time
  formatDate,
  formatRelativeTime,
  calculateReadingTime,
  formatDuration,
  
  // Array & Object
  removeDuplicates,
  sortByProperty,
  groupBy,
  paginateArray,
  deepClone,
  deepMerge,
  isObject,
  
  // Number & Math
  formatNumber,
  randomInRange,
  calculatePercentage,
  clamp,
  
  // File & URL
  isValidUrl,
  extractDomain,
  getFileExtension,
  isValidFileType,
  isValidFileSize,
  
  // Book-specific
  generateBookCoverPlaceholder,
  normalizeISBN,
  calculateBookProgress,
  estimateCompletionTime,
  
  // Pagination
  generatePagination,
  getPaginationParams,
  
  // Search & Filter
  buildSearchQuery,
  buildFilterQuery,
  
  // Performance & Logging
  measureExecutionTime,
  generateRequestId,
  logPerformance,
  
  // Security
  generateSecureToken,
  hashData,
  maskSensitiveData,
  
  // Environment
  isProduction,
  isDevelopment,
  getEnv
};