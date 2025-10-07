// backend/services/googleBooksService.js
import axios from 'axios';
import Book from '../models/Book.js';

/**
 * Google Books API Service
 * Handles integration with Google Books API for book search and metadata
 */

// Google Books API configuration
const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1';
const API_TIMEOUT = 10000; // 10 seconds
const MAX_RESULTS = 40;

// Cache for API responses to reduce rate limiting
const cache = new Map();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Make a request to Google Books API with error handling and caching
 */
const makeGoogleBooksRequest = async (endpoint, params = {}) => {
  try {
    // Create cache key
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    
    // Check cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📚 Using cached response for: ${endpoint}`);
        return cached.data;
      }
    }

    const config = {
      timeout: API_TIMEOUT,
      params: {
        ...params,
        key: process.env.GOOGLE_BOOKS_API_KEY // Optional API key
      }
    };

    console.log(`🌐 Google Books API Request: ${endpoint}`, params);

    const response = await axios.get(`${GOOGLE_BOOKS_API_BASE}${endpoint}`, config);
    
    // Cache the response
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });

    return response.data;

  } catch (error) {
    console.error('❌ Google Books API Error:', {
      endpoint,
      params,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      throw new Error('Google Books API request timeout');
    }

    if (error.response?.status === 403) {
      throw new Error('Google Books API rate limit exceeded');
    }

    if (error.response?.status === 404) {
      throw new Error('Book not found in Google Books API');
    }

    throw new Error(`Google Books API error: ${error.message}`);
  }
};

/**
 * Search books using Google Books API
 * @param {Object} options - Search options
 * @param {string} options.q - Search query
 * @param {number} options.maxResults - Maximum results (default: 40)
 * @param {number} options.startIndex - Start index for pagination
 * @param {string} options.orderBy - Order by: relevance, newest
 * @param {string} options.printType - Print type: all, books, magazines
 * @param {string} options.langRestrict - Language restriction
 * @returns {Promise<Object>} Search results
 */
export const searchBooksFromGoogle = async (options = {}) => {
  try {
    const {
      q = '',
      maxResults = MAX_RESULTS,
      startIndex = 0,
      orderBy = 'relevance',
      printType = 'all',
      langRestrict = 'en'
    } = options;

    if (!q.trim()) {
      throw new Error('Search query is required');
    }

    const params = {
      q: q.trim(),
      maxResults: Math.min(maxResults, 40), // Google API max is 40
      startIndex: Math.max(0, startIndex),
      orderBy,
      printType: printType !== 'all' ? printType : undefined,
      langRestrict: langRestrict !== 'any' ? langRestrict : undefined,
      projection: 'lite'
    };

    // Remove undefined parameters
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });

    const data = await makeGoogleBooksRequest('/volumes', params);

    // Transform the response to a more usable format
    return {
      items: data.items || [],
      totalItems: data.totalItems || 0,
      kind: data.kind,
      searchQuery: q,
      resultsCount: data.items ? data.items.length : 0
    };

  } catch (error) {
    console.error('❌ Google Books search error:', error);
    throw error;
  }
};

/**
 * Fetch book details by Google Books ID
 * @param {string} bookId - Google Books ID
 * @returns {Promise<Object>} Book details
 */
export const fetchBookByIdFromGoogle = async (bookId) => {
  try {
    if (!bookId) {
      throw new Error('Book ID is required');
    }

    const data = await makeGoogleBooksRequest(`/volumes/${bookId}`);

    if (!data) {
      throw new Error('Book not found');
    }

    return data;

  } catch (error) {
    console.error('❌ Google Books fetch by ID error:', error);
    
    if (error.message.includes('not found')) {
      throw new Error(`Book with ID ${bookId} not found in Google Books`);
    }
    
    throw error;
  }
};

/**
 * Fetch books by ISBN
 * @param {string} isbn - ISBN (10 or 13 digits)
 * @returns {Promise<Object>} Book details
 */
export const fetchBookByISBN = async (isbn) => {
  try {
    if (!isbn) {
      throw new Error('ISBN is required');
    }

    // Clean ISBN (remove hyphens and spaces)
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    const data = await searchBooksFromGoogle({
      q: `isbn:${cleanISBN}`,
      maxResults: 1
    });

    if (!data.items || data.items.length === 0) {
      throw new Error(`Book with ISBN ${isbn} not found`);
    }

    return data.items[0];

  } catch (error) {
    console.error('❌ Google Books fetch by ISBN error:', error);
    throw error;
  }
};

/**
 * Fetch books by author
 * @param {string} author - Author name
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Object>} Search results
 */
export const fetchBooksByAuthor = async (author, maxResults = 20) => {
  try {
    if (!author) {
      throw new Error('Author name is required');
    }

    return await searchBooksFromGoogle({
      q: `inauthor:"${author}"`,
      maxResults,
      orderBy: 'relevance'
    });

  } catch (error) {
    console.error('❌ Google Books fetch by author error:', error);
    throw error;
  }
};

/**
 * Fetch books by genre/category
 * @param {string} genre - Genre/category
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Object>} Search results
 */
export const fetchBooksByGenre = async (genre, maxResults = 20) => {
  try {
    if (!genre) {
      throw new Error('Genre is required');
    }

    return await searchBooksFromGoogle({
      q: `subject:"${genre}"`,
      maxResults,
      orderBy: 'relevance'
    });

  } catch (error) {
    console.error('❌ Google Books fetch by genre error:', error);
    throw error;
  }
};

/**
 * Fetch trending books (recently published and highly rated)
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Object>} Search results
 */
export const fetchTrendingBooks = async (maxResults = 20) => {
  try {
    // Get current year for recent publications
    const currentYear = new Date().getFullYear();
    
    return await searchBooksFromGoogle({
      q: `published:${currentYear-1}-${currentYear}`,
      maxResults,
      orderBy: 'newest'
    });

  } catch (error) {
    console.error('❌ Google Books fetch trending error:', error);
    throw error;
  }
};

/**
 * Fetch new releases (books published in the last 90 days)
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Object>} Search results
 */
export const fetchNewReleases = async (maxResults = 20) => {
  try {
    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const dateString = ninetyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return await searchBooksFromGoogle({
      q: `published:${dateString}`,
      maxResults,
      orderBy: 'newest'
    });

  } catch (error) {
    console.error('❌ Google Books fetch new releases error:', error);
    throw error;
  }
};

/**
 * Transform Google Books API data to our local book format
 * @param {Object} googleBook - Google Books API response item
 * @param {boolean} saveToDatabase - Whether to save to database
 * @returns {Promise<Object>} Transformed book data
 */
export const transformGoogleBookToLocal = async (googleBook, saveToDatabase = false) => {
  try {
    if (!googleBook) {
      throw new Error('Google book data is required');
    }

    const volumeInfo = googleBook.volumeInfo || {};
    const saleInfo = googleBook.saleInfo || {};
    const accessInfo = googleBook.accessInfo || {};

    // Extract basic information
    const bookData = {
      googleBooksId: googleBook.id,
      title: volumeInfo.title || 'Unknown Title',
      subtitle: volumeInfo.subtitle || '',
      authors: volumeInfo.authors || ['Unknown Author'],
      primaryAuthor: volumeInfo.authors?.[0] || 'Unknown Author',
      description: volumeInfo.description || 'No description available.',
      shortDescription: volumeInfo.description 
        ? volumeInfo.description.substring(0, 200) + (volumeInfo.description.length > 200 ? '...' : '')
        : 'No description available.',
      genres: volumeInfo.categories || ['General'],
      categories: volumeInfo.categories || [],
      language: volumeInfo.language || 'en',
      pageCount: volumeInfo.pageCount || 0,
      publicationDate: volumeInfo.publishedDate 
        ? new Date(volumeInfo.publishedDate) 
        : new Date(),
      publisher: volumeInfo.publisher || 'Unknown Publisher',
      printType: volumeInfo.printType || 'BOOK',
      maturityRating: volumeInfo.maturityRating || 'NOT_MATURE',
      averageRating: volumeInfo.averageRating || 0,
      ratingsCount: volumeInfo.ratingsCount || 0
    };

    // Handle cover images
    if (volumeInfo.imageLinks) {
      bookData.coverImage = volumeInfo.imageLinks.thumbnail?.replace('http://', 'https://') 
        || volumeInfo.imageLinks.smallThumbnail?.replace('http://', 'https://')
        || generatePlaceholderImage(bookData.title);

      bookData.images = {
        small: volumeInfo.imageLinks.small?.replace('http://', 'https://'),
        medium: volumeInfo.imageLinks.medium?.replace('http://', 'https://'),
        large: volumeInfo.imageLinks.large?.replace('http://', 'https://'),
        thumbnail: volumeInfo.imageLinks.thumbnail?.replace('http://', 'https://'),
        smallThumbnail: volumeInfo.imageLinks.smallThumbnail?.replace('http://', 'https://')
      };
    } else {
      bookData.coverImage = generatePlaceholderImage(bookData.title);
    }

    // Handle ISBNs
    if (volumeInfo.industryIdentifiers) {
      volumeInfo.industryIdentifiers.forEach(identifier => {
        if (identifier.type === 'ISBN_10') {
          bookData.isbn10 = identifier.identifier;
        } else if (identifier.type === 'ISBN_13') {
          bookData.isbn13 = identifier.identifier;
        }
      });
      
      // Set main ISBN
      bookData.isbn = bookData.isbn13 || bookData.isbn10;
    }

    // Handle pricing information
    if (saleInfo.listPrice) {
      bookData.price = saleInfo.listPrice.amount || 9.99;
      bookData.currency = saleInfo.listPrice.currencyCode || 'USD';
    } else if (saleInfo.retailPrice) {
      bookData.price = saleInfo.retailPrice.amount || 9.99;
      bookData.currency = saleInfo.retailPrice.currencyCode || 'USD';
    } else {
      bookData.price = 9.99;
      bookData.currency = 'USD';
    }

    // Add saleability info
    bookData.saleInfo = {
      saleability: saleInfo.saleability || 'NOT_FOR_SALE',
      isEbook: saleInfo.isEbook || false,
      buyLink: saleInfo.buyLink
    };

    // Add metadata links
    bookData.metadata = {
      googleBooksLink: volumeInfo.infoLink,
      previewLink: volumeInfo.previewLink,
      canonicalVolumeLink: volumeInfo.canonicalVolumeLink,
      webReaderLink: accessInfo?.webReaderLink,
      pdfLink: accessInfo?.pdf?.acsTokenLink,
      epubLink: accessInfo?.epub?.acsTokenLink,
      textToSpeechPermission: accessInfo?.textToSpeechPermission
    };

    // Generate search keywords
    bookData.searchKeywords = generateSearchKeywords(bookData);

    // Set stock and availability (mock data for demo)
    bookData.stock = Math.floor(Math.random() * 50) + 10;
    bookData.available = bookData.stock;

    // Set featured/bestseller status randomly for demo
    bookData.featured = Math.random() > 0.7;
    bookData.bestseller = Math.random() > 0.8;
    bookData.newRelease = isNewRelease(bookData.publicationDate);

    // Add access information
    bookData.accessInfo = {
      viewability: accessInfo.viewability || 'NO_PAGES',
      embeddable: accessInfo.embeddable || false,
      publicDomain: accessInfo.publicDomain || false,
      textToSpeechPermission: accessInfo.textToSpeechPermission || 'ALLOWED'
    };

    if (saveToDatabase) {
      // Check if book already exists in database
      let existingBook = await Book.findOne({ googleBooksId: googleBook.id });
      
      if (existingBook) {
        console.log(`📚 Book already exists in database: ${existingBook.title}`);
        return existingBook;
      }

      // Check by ISBN as well
      if (bookData.isbn) {
        existingBook = await Book.findOne({ 
          $or: [
            { isbn: bookData.isbn },
            { isbn10: bookData.isbn10 },
            { isbn13: bookData.isbn13 }
          ]
        });

        if (existingBook) {
          console.log(`📚 Book with ISBN ${bookData.isbn} already exists: ${existingBook.title}`);
          
          // Update Google Books ID if missing
          if (!existingBook.googleBooksId) {
            existingBook.googleBooksId = googleBook.id;
            await existingBook.save();
          }
          
          return existingBook;
        }
      }

      // Create new book in database
      try {
        const newBook = new Book(bookData);
        await newBook.save();
        console.log(`✅ New book saved to database: ${newBook.title}`);
        return newBook;
      } catch (dbError) {
        console.error('❌ Error saving book to database:', dbError);
        
        // If it's a duplicate error, try to find the existing book
        if (dbError.code === 11000) {
          existingBook = await Book.findOne({ googleBooksId: googleBook.id });
          if (existingBook) {
            return existingBook;
          }
        }
        
        throw dbError;
      }
    }

    // Return book data without saving to database
    return bookData;

  } catch (error) {
    console.error('❌ Error transforming Google Book:', error);
    
    // Return a basic book object even if transformation fails
    return {
      googleBooksId: googleBook?.id || 'unknown',
      title: googleBook?.volumeInfo?.title || 'Unknown Title',
      authors: googleBook?.volumeInfo?.authors || ['Unknown Author'],
      description: 'Error loading book details.',
      coverImage: generatePlaceholderImage(googleBook?.volumeInfo?.title || 'Book'),
      price: 9.99,
      currency: 'USD',
      error: error.message
    };
  }
};

/**
 * Generate placeholder image URL
 */
const generatePlaceholderImage = (title) => {
  const firstChar = title ? title.charAt(0).toUpperCase() : 'B';
  return `https://placehold.co/300x400/6a11cb/ffffff?text=${encodeURIComponent(firstChar)}`;
};

/**
 * Generate search keywords from book data
 */
const generateSearchKeywords = (bookData) => {
  const keywords = new Set();
  
  // Add title words
  if (bookData.title) {
    bookData.title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  }
  
  // Add author names
  if (bookData.authors) {
    bookData.authors.forEach(author => {
      author.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2)
        .forEach(word => keywords.add(word));
    });
  }
  
  // Add genres
  if (bookData.genres) {
    bookData.genres.forEach(genre => {
      genre.toLowerCase()
        .split(/[/,\s]+/)
        .filter(word => word.length > 2)
        .forEach(word => keywords.add(word));
    });
  }
  
  // Add publisher
  if (bookData.publisher) {
    bookData.publisher.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  }
  
  return Array.from(keywords);
};

/**
 * Check if book is a new release (published in last 90 days)
 */
const isNewRelease = (publicationDate) => {
  if (!publicationDate) return false;
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  return new Date(publicationDate) >= ninetyDaysAgo;
};

/**
 * Batch transform multiple Google Books
 */
export const transformMultipleGoogleBooks = async (googleBooks, saveToDatabase = false) => {
  try {
    const transformedBooks = await Promise.all(
      googleBooks.map(googleBook => 
        transformGoogleBookToLocal(googleBook, saveToDatabase)
      )
    );

    // Filter out any failed transformations
    return transformedBooks.filter(book => book && !book.error);

  } catch (error) {
    console.error('❌ Error transforming multiple Google Books:', error);
    return [];
  }
};

/**
 * Get similar books based on a book's genres and authors
 */
export const getSimilarBooksFromGoogle = async (book, limit = 6) => {
  try {
    if (!book.genres || book.genres.length === 0) {
      return [];
    }

    // Use the primary genre for search
    const primaryGenre = book.genres[0];
    const results = await searchBooksFromGoogle({
      q: `subject:"${primaryGenre}"`,
      maxResults: limit * 2, // Get more results to filter
      orderBy: 'relevance'
    });

    // Filter out the original book and transform results
    const similarBooks = await transformMultipleGoogleBooks(
      (results.items || [])
        .filter(item => item.id !== book.googleBooksId)
        .slice(0, limit)
    );

    return similarBooks;

  } catch (error) {
    console.error('❌ Error getting similar books:', error);
    return [];
  }
};

/**
 * Health check for Google Books API
 */
export const checkGoogleBooksAPIHealth = async () => {
  try {
    const testQuery = 'javascript programming';
    const results = await searchBooksFromGoogle({
      q: testQuery,
      maxResults: 1
    });

    return {
      status: 'healthy',
      message: 'Google Books API is responding correctly',
      responseTime: 'normal',
      resultsCount: results.totalItems || 0
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Google Books API is not responding: ${error.message}`,
      responseTime: 'timeout',
      resultsCount: 0
    };
  }
};

/**
 * Clear the API cache
 */
export const clearCache = () => {
  cache.clear();
  console.log('🧹 Google Books API cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
};

export default {
  searchBooksFromGoogle,
  fetchBookByIdFromGoogle,
  fetchBookByISBN,
  fetchBooksByAuthor,
  fetchBooksByGenre,
  fetchTrendingBooks,
  fetchNewReleases,
  transformGoogleBookToLocal,
  transformMultipleGoogleBooks,
  getSimilarBooksFromGoogle,
  checkGoogleBooksAPIHealth,
  clearCache,
  getCacheStats
};