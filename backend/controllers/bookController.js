import Book from '../models/Book.js';
import ReadingSession from '../models/ReadingSession.js';
import User from '../models/User.js';
import { fetchBooksFromGoogle, fetchBookByIdFromGoogle, searchBooksFromGoogle } from '../services/googleBooksService.js';

/**
 * Book Controller
 * Handles book operations including Google Books API integration, search, and recommendations
 */

/**
 * @desc    Search books with Google Books API and local database
 * @route   GET /api/books/search
 * @access  Public
 */
export const searchBooks = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 20,
      genre,
      author,
      language = 'en',
      orderBy = 'relevance',
      printType = 'all',
      maxResults = 40
    } = req.query;

    // Validate search query
    if (!q.trim() && !genre && !author) {
      return res.status(400).json({
        success: false,
        message: 'Search query, genre, or author is required'
      });
    }

    console.log(`🔍 Searching books: "${q}" | Genre: ${genre} | Author: ${author}`);

    let searchResults = [];
    let totalResults = 0;

    // Build search query for Google Books API
    let searchQuery = q;
    
    if (genre) {
      searchQuery += ` subject:${genre}`;
    }
    
    if (author) {
      searchQuery += ` inauthor:${author}`;
    }

    // Search Google Books API
    try {
      const googleResults = await searchBooksFromGoogle({
        q: searchQuery.trim(),
        maxResults: parseInt(maxResults),
        orderBy,
        printType: printType !== 'all' ? printType : undefined,
        langRestrict: language !== 'any' ? language : undefined
      });

      searchResults = googleResults.items || [];
      totalResults = googleResults.totalItems || 0;

    } catch (googleError) {
      console.error('❌ Google Books API error:', googleError);
      // Continue with empty results if Google API fails
      searchResults = [];
      totalResults = 0;
    }

    // Transform Google Books data to our format
    const transformedBooks = await Promise.all(
      searchResults.slice(0, parseInt(limit)).map(async (googleBook) => {
        try {
          return await transformGoogleBookToLocal(googleBook);
        } catch (error) {
          console.error('Error transforming book:', error);
          return null;
        }
      })
    );

    // Filter out null values and remove duplicates
    const validBooks = transformedBooks
      .filter(book => book !== null)
      .filter((book, index, self) => 
        index === self.findIndex(b => b.googleBooksId === book.googleBooksId)
      );

    // Calculate pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedBooks = validBooks.slice(startIndex, endIndex);

    // Track search interaction if user is logged in
    if (req.user && q.trim()) {
      try {
        await User.findByIdAndUpdate(req.user.id, {
          $push: {
            searchHistory: {
              query: q,
              resultsCount: validBooks.length,
              timestamp: new Date()
            }
          }
        });
      } catch (trackingError) {
        console.error('Error tracking search:', trackingError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Found ${validBooks.length} books`,
      data: {
        books: paginatedBooks,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(validBooks.length / parseInt(limit)),
          total: validBooks.length,
          hasNext: endIndex < validBooks.length,
          hasPrev: startIndex > 0
        },
        searchInfo: {
          query: q,
          genre,
          author,
          totalGoogleResults: totalResults
        }
      }
    });

  } catch (error) {
    console.error('❌ Search books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get book by ID (local or Google Books ID)
 * @route   GET /api/books/:id
 * @access  Public
 */
export const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    let book = null;

    // Try to find in local database first
    if (id.length === 24) { // MongoDB ObjectId length
      book = await Book.findById(id)
        .populate('reviews.user', 'username profile avatar');
    }

    // If not found locally, try Google Books ID
    if (!book) {
      book = await Book.findOne({ googleBooksId: id })
        .populate('reviews.user', 'username profile avatar');
    }

    // If still not found, fetch from Google Books API
    if (!book) {
      try {
        const googleBook = await fetchBookByIdFromGoogle(id);
        if (googleBook) {
          book = await transformGoogleBookToLocal(googleBook, true);
        }
      } catch (googleError) {
        console.error('Google Books fetch error:', googleError);
      }
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Track view if user is logged in
    if (req.user) {
      try {
        // Add to user's viewing history
        await User.findByIdAndUpdate(req.user.id, {
          $push: {
            viewedBooks: {
              book: book._id,
              timestamp: new Date()
            }
          }
        });

        // Create or update reading session for view
        await ReadingSession.findOneAndUpdate(
          {
            user: req.user.id,
            book: book._id,
            status: 'viewed'
          },
          {
            $set: {
              lastViewedAt: new Date(),
              status: 'viewed'
            },
            $inc: { viewCount: 1 }
          },
          {
            upsert: true,
            new: true
          }
        );
      } catch (trackingError) {
        console.error('Error tracking book view:', trackingError);
      }
    }

    // Get similar books
    const similarBooks = await getSimilarBooks(book);

    // Get reading statistics for logged-in users
    let userReadingStats = null;
    if (req.user) {
      userReadingStats = await ReadingSession.findOne({
        user: req.user.id,
        book: book._id,
        status: { $in: ['reading', 'completed'] }
      }).select('progress duration lastReadAt status');
    }

    res.status(200).json({
      success: true,
      data: {
        book,
        similarBooks: similarBooks.slice(0, 6),
        userReadingStats
      }
    });

  } catch (error) {
    console.error('❌ Get book by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get books by genre/category
 * @route   GET /api/books/genre/:genre
 * @access  Public
 */
export const getBooksByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!genre) {
      return res.status(400).json({
        success: false,
        message: 'Genre is required'
      });
    }

    console.log(`📚 Fetching books by genre: ${genre}`);

    // Search Google Books for this genre
    const googleResults = await searchBooksFromGoogle({
      q: `subject:${genre}`,
      maxResults: 40,
      orderBy: 'relevance'
    });

    const books = await Promise.all(
      (googleResults.items || []).slice(0, parseInt(limit)).map(googleBook => 
        transformGoogleBookToLocal(googleBook)
      )
    );

    const validBooks = books.filter(book => book !== null);

    res.status(200).json({
      success: true,
      data: {
        genre,
        books: validBooks,
        count: validBooks.length
      }
    });

  } catch (error) {
    console.error('❌ Get books by genre error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching books by genre',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get trending books
 * @route   GET /api/books/trending
 * @access  Public
 */
export const getTrendingBooks = async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    // Search for popular books across different genres
    const popularQueries = [
      'bestselling fiction 2024',
      'award winning books',
      'popular science books',
      'bestseller romance',
      'popular mystery books'
    ];

    let allBooks = [];

    // Fetch books from multiple popular categories
    for (const query of popularQueries.slice(0, 3)) {
      try {
        const results = await searchBooksFromGoogle({
          q: query,
          maxResults: 8,
          orderBy: 'relevance'
        });

        const transformedBooks = await Promise.all(
          (results.items || []).map(googleBook => 
            transformGoogleBookToLocal(googleBook)
          )
        );

        allBooks = [...allBooks, ...transformedBooks.filter(book => book !== null)];
      } catch (error) {
        console.error(`Error fetching for query "${query}":`, error);
      }
    }

    // Remove duplicates and limit results
    const uniqueBooks = allBooks
      .filter((book, index, self) => 
        index === self.findIndex(b => b.googleBooksId === book.googleBooksId)
      )
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        books: uniqueBooks,
        count: uniqueBooks.length
      }
    });

  } catch (error) {
    console.error('❌ Get trending books error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending books',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get new releases
 * @route   GET /api/books/new-releases
 * @access  Public
 */
export const getNewReleases = async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    // Get current year and previous year for new releases
    const currentYear = new Date().getFullYear();
    const queries = [
      `inauthor:2024`,
      `inauthor:${currentYear}`,
      'new releases'
    ];

    let allBooks = [];

    for (const query of queries.slice(0, 2)) {
      try {
        const results = await searchBooksFromGoogle({
          q: query,
          maxResults: 10,
          orderBy: 'newest'
        });

        const transformedBooks = await Promise.all(
          (results.items || []).map(googleBook => 
            transformGoogleBookToLocal(googleBook)
          )
        );

        allBooks = [...allBooks, ...transformedBooks.filter(book => book !== null)];
      } catch (error) {
        console.error(`Error fetching new releases for "${query}":`, error);
      }
    }

    // Sort by publication date and remove duplicates
    const uniqueBooks = allBooks
      .filter((book, index, self) => 
        index === self.findIndex(b => b.googleBooksId === book.googleBooksId)
      )
      .sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate))
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        books: uniqueBooks,
        count: uniqueBooks.length
      }
    });

  } catch (error) {
    console.error('❌ Get new releases error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching new releases',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get book recommendations for user
 * @route   GET /api/books/recommendations
 * @access  Private
 */
export const getRecommendations = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const userId = req.user.id;

    // Get user's reading history and preferences
    const user = await User.findById(userId)
      .populate('currentlyReading.book', 'genres authors')
      .populate('finishedBooks.book', 'genres authors')
      .populate('wantToRead', 'genres authors');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Extract user preferences
    const favoriteGenres = user.preferences?.favoriteGenres || [];
    const favoriteAuthors = user.preferences?.favoriteAuthors || [];

    // Get genres from reading history
    const historyGenres = [
      ...user.currentlyReading.flatMap(item => item.book?.genres || []),
      ...user.finishedBooks.flatMap(item => item.book?.genres || []),
      ...user.wantToRead.flatMap(book => book.genres || [])
    ];

    const allGenres = [...new Set([...favoriteGenres, ...historyGenres])];
    
    // Get authors from reading history
    const historyAuthors = [
      ...user.currentlyReading.flatMap(item => item.book?.authors || []),
      ...user.finishedBooks.flatMap(item => item.book?.authors || []),
      ...user.wantToRead.flatMap(book => book.authors || [])
    ];

    const allAuthors = [...new Set([...favoriteAuthors, ...historyAuthors])];

    let recommendedBooks = [];

    // If user has preferences, search based on them
    if (allGenres.length > 0 || allAuthors.length > 0) {
      const searchQueries = [];

      // Add genre-based queries
      if (allGenres.length > 0) {
        const topGenres = allGenres.slice(0, 3);
        topGenres.forEach(genre => {
          searchQueries.push(`subject:${genre}`);
        });
      }

      // Add author-based queries
      if (allAuthors.length > 0) {
        const topAuthors = allAuthors.slice(0, 2);
        topAuthors.forEach(author => {
          searchQueries.push(`inauthor:"${author}"`);
        });
      }

      // Execute searches
      for (const query of searchQueries.slice(0, 3)) {
        try {
          const results = await searchBooksFromGoogle({
            q: query,
            maxResults: 8,
            orderBy: 'relevance'
          });

          const transformedBooks = await Promise.all(
            (results.items || []).map(googleBook => 
              transformGoogleBookToLocal(googleBook)
            )
          );

          recommendedBooks = [...recommendedBooks, ...transformedBooks.filter(book => book !== null)];
        } catch (error) {
          console.error(`Error fetching recommendations for "${query}":`, error);
        }
      }
    } else {
      // Fallback to trending books for new users
      const trendingResults = await getTrendingBooks(req, res, true);
      recommendedBooks = trendingResults?.data?.books || [];
    }

    // Remove duplicates and books user already has
    const userBookIds = new Set([
      ...user.currentlyReading.map(item => item.book?._id?.toString()),
      ...user.finishedBooks.map(item => item.book?._id?.toString()),
      ...user.wantToRead.map(book => book._id?.toString())
    ].filter(id => id));

    const uniqueRecommendations = recommendedBooks
      .filter(book => !userBookIds.has(book._id?.toString()))
      .filter((book, index, self) => 
        index === self.findIndex(b => b.googleBooksId === book.googleBooksId)
      )
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        books: uniqueRecommendations,
        count: uniqueRecommendations.length,
        basedOn: {
          genres: allGenres.slice(0, 3),
          authors: allAuthors.slice(0, 2)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Add book review/rating
 * @route   POST /api/books/:id/reviews
 * @access  Private
 */
export const addBookReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, title } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Review comment must be at least 10 characters long'
      });
    }

    // Find book
    let book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if user already reviewed this book
    const existingReview = book.reviews.find(
      review => review.user.toString() === userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this book'
      });
    }

    // Add review
    book.reviews.push({
      user: userId,
      rating: parseInt(rating),
      comment: comment.trim(),
      title: title?.trim(),
      isVerifiedPurchase: true // Assuming they've read it if they're reviewing
    });

    // Update average rating
    book.updateAverageRating();
    await book.save();

    // Populate the new review with user info
    await book.populate('reviews.user', 'username profile avatar');

    const newReview = book.reviews[book.reviews.length - 1];

    // Update user's reading history
    await User.findByIdAndUpdate(userId, {
      $push: {
        readingHistory: {
          book: book._id,
          interactionType: 'review',
          rating: parseInt(rating),
          review: comment.trim(),
          timestamp: new Date()
        }
      }
    });

    console.log(`⭐ Review added for book: ${book.title} by user: ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: {
        review: newReview,
        book: {
          id: book._id,
          title: book.title,
          averageRating: book.averageRating,
          ratingsCount: book.ratingsCount
        }
      }
    });

  } catch (error) {
    console.error('❌ Add book review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get book reviews
 * @route   GET /api/books/:id/reviews
 * @access  Public
 */
export const getBookReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const book = await Book.findById(id)
      .populate('reviews.user', 'username profile avatar')
      .select('reviews title');

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Sort reviews
    let sortedReviews = [...book.reviews];
    switch (sort) {
      case 'helpful':
        sortedReviews.sort((a, b) => (b.helpful?.votes || 0) - (a.helpful?.votes || 0));
        break;
      case 'rating':
        sortedReviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'recent':
      default:
        sortedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    // Paginate reviews
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedReviews = sortedReviews.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        book: {
          id: book._id,
          title: book.title,
          averageRating: book.averageRating,
          ratingsCount: book.ratingsCount
        },
        reviews: paginatedReviews,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(sortedReviews.length / parseInt(limit)),
          total: sortedReviews.length,
          hasNext: endIndex < sortedReviews.length,
          hasPrev: startIndex > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Get book reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching book reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to transform Google Books data to local format
async function transformGoogleBookToLocal(googleBook, saveToDatabase = false) {
  try {
    const volumeInfo = googleBook.volumeInfo;
    const saleInfo = googleBook.saleInfo;
    const accessInfo = googleBook.accessInfo;

    // Extract basic information
    const bookData = {
      googleBooksId: googleBook.id,
      title: volumeInfo.title || 'Unknown Title',
      subtitle: volumeInfo.subtitle,
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
        || `https://placehold.co/300x400/6a11cb/ffffff?text=${encodeURIComponent(bookData.title.charAt(0))}`;

      bookData.images = {
        small: volumeInfo.imageLinks.small?.replace('http://', 'https://'),
        medium: volumeInfo.imageLinks.medium?.replace('http://', 'https://'),
        large: volumeInfo.imageLinks.large?.replace('http://', 'https://'),
        thumbnail: volumeInfo.imageLinks.thumbnail?.replace('http://', 'https://'),
        smallThumbnail: volumeInfo.imageLinks.smallThumbnail?.replace('http://', 'https://')
      };
    } else {
      bookData.coverImage = `https://placehold.co/300x400/6a11cb/ffffff?text=${encodeURIComponent(bookData.title.charAt(0))}`;
    }

    // Handle pricing information
    if (saleInfo && saleInfo.listPrice) {
      bookData.price = saleInfo.listPrice.amount || 9.99;
      bookData.currency = saleInfo.listPrice.currencyCode || 'USD';
    } else {
      bookData.price = 9.99;
      bookData.currency = 'USD';
    }

    // Add metadata links
    bookData.metadata = {
      googleBooksLink: volumeInfo.infoLink,
      previewLink: volumeInfo.previewLink,
      canonicalVolumeLink: volumeInfo.canonicalVolumeLink,
      webReaderLink: accessInfo?.webReaderLink,
      pdfLink: accessInfo?.pdf?.acsTokenLink
    };

    // Generate search keywords
    bookData.searchKeywords = [
      ...bookData.title.toLowerCase().split(' '),
      ...bookData.authors.flatMap(author => author.toLowerCase().split(' ')),
      ...bookData.genres.flatMap(genre => genre.toLowerCase().split(/[/,\s]+/))
    ].filter((keyword, index, array) => 
      keyword.length > 2 && array.indexOf(keyword) === index
    );

    // Set stock and availability
    bookData.stock = Math.floor(Math.random() * 50) + 10; // Random stock for demo
    bookData.available = bookData.stock;

    // Set featured/bestseller status randomly for demo
    bookData.featured = Math.random() > 0.7;
    bookData.bestseller = Math.random() > 0.8;
    bookData.newRelease = new Date(bookData.publicationDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    if (saveToDatabase) {
      // Check if book already exists in database
      let existingBook = await Book.findOne({ googleBooksId: googleBook.id });
      
      if (existingBook) {
        return existingBook;
      }

      // Create new book in database
      const newBook = new Book(bookData);
      await newBook.save();
      return newBook;
    }

    // Return book data without saving to database
    return bookData;

  } catch (error) {
    console.error('Error transforming Google Book:', error);
    return null;
  }
}

// Helper function to get similar books
async function getSimilarBooks(book, limit = 6) {
  try {
    if (!book.genres || book.genres.length === 0) {
      return [];
    }

    // Search for books in the same genres
    const primaryGenre = book.genres[0];
    const results = await searchBooksFromGoogle({
      q: `subject:"${primaryGenre}"`,
      maxResults: 12,
      orderBy: 'relevance'
    });

    const similarBooks = await Promise.all(
      (results.items || [])
        .filter(item => item.id !== book.googleBooksId)
        .slice(0, limit)
        .map(googleBook => transformGoogleBookToLocal(googleBook))
    );

    return similarBooks.filter(book => book !== null);
  } catch (error) {
    console.error('Error getting similar books:', error);
    return [];
  }
}

export default {
  searchBooks,
  getBookById,
  getBooksByGenre,
  getTrendingBooks,
  getNewReleases,
  getRecommendations,
  addBookReview,
  getBookReviews
};