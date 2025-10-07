import mongoose from 'mongoose';

/**
 * Book Model
 * Represents a book in the BookifyMe system with Google Books API integration
 */

const bookSchema = new mongoose.Schema({
  // Google Books API Integration
  googleBooksId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    trim: true
  },

  // Basic Book Information
  title: { 
    type: String, 
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [500, 'Book title cannot exceed 500 characters'],
    index: true
  },

  subtitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Book subtitle cannot exceed 500 characters']
  },

  authors: [{ 
    type: String,
    required: [true, 'At least one author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  }],

  primaryAuthor: {
    type: String,
    trim: true,
    maxlength: [100, 'Primary author name cannot exceed 100 characters']
  },

  // Identification
  isbn: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const cleanISBN = v.replace(/[-\s]/g, '');
        return /^(?:\d{10}|\d{13})$/.test(cleanISBN);
      },
      message: 'Please enter a valid ISBN (10 or 13 digits)'
    }
  },

  isbn10: {
    type: String,
    trim: true,
    sparse: true
  },

  isbn13: {
    type: String,
    trim: true,
    sparse: true
  },

  // Description & Content
  description: { 
    type: String,
    required: [true, 'Book description is required'],
    maxlength: [10000, 'Book description cannot exceed 10000 characters'],
    trim: true
  },

  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters'],
    trim: true
  },

  synopsis: {
    type: String,
    maxlength: [2000, 'Synopsis cannot exceed 2000 characters'],
    trim: true
  },

  // Categories & Classification
  genres: [{ 
    type: String,
    required: [true, 'At least one genre is required'],
    trim: true,
    lowercase: true,
    maxlength: [50, 'Genre name cannot exceed 50 characters']
  }],

  categories: [{
    type: String,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  }],

  // Images
  coverImage: { 
    type: String,
    required: [true, 'Cover image is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please provide a valid URL for the cover image'
    }
  },

  images: {
    small: String,
    medium: String,
    large: String,
    thumbnail: String,
    smallThumbnail: String
  },

  // Pricing
  price: { 
    type: Number, 
    required: [true, 'Book price is required'],
    min: [0, 'Price cannot be negative'],
    max: [1000, 'Price cannot exceed $1000']
  },

  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    enum: {
      values: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'],
      message: 'Currency must be one of: USD, EUR, GBP, CAD, AUD, INR'
    }
  },

  // Discount & Offers
  discount: {
    percentage: { 
      type: Number, 
      default: 0, 
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100%']
    },
    amount: {
      type: Number,
      min: [0, 'Discount amount cannot be negative']
    },
    validFrom: Date,
    validUntil: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },

  // Ratings & Reviews
  averageRating: { 
    type: Number, 
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    set: function(v) {
      return Math.round(v * 10) / 10; // Round to 1 decimal place
    }
  },

  ratingsCount: { 
    type: Number, 
    default: 0,
    min: [0, 'Ratings count cannot be negative']
  },

  reviews: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    rating: { 
      type: Number, 
      required: true, 
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer'
      }
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
      trim: true
    },
    title: {
      type: String,
      maxlength: [200, 'Review title cannot exceed 200 characters'],
      trim: true
    },
    helpful: {
      votes: { 
        type: Number, 
        default: 0,
        min: 0
      },
      voters: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      }]
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: Date
  }],

  // Publication Details
  publicationDate: {
    type: Date,
    required: [true, 'Publication date is required'],
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'Publication date cannot be in the future'
    }
  },

  publisher: {
    type: String,
    trim: true,
    maxlength: [200, 'Publisher name cannot exceed 200 characters']
  },

  pageCount: {
    type: Number,
    min: [1, 'Page count must be at least 1'],
    max: [10000, 'Page count cannot exceed 10000'],
    validate: {
      validator: Number.isInteger,
      message: 'Page count must be an integer'
    }
  },

  // Format & Physical Details
  printType: {
    type: String,
    enum: {
      values: ['BOOK', 'MAGAZINE', 'NEWSPAPER', 'AUDIOBOOK', 'EBOOK'],
      message: 'Print type must be one of: BOOK, MAGAZINE, NEWSPAPER, AUDIOBOOK, EBOOK'
    },
    default: 'BOOK'
  },

  language: { 
    type: String, 
    default: 'en',
    lowercase: true,
    match: [/^[a-z]{2}$/, 'Language must be a 2-letter code']
  },

  maturityRating: {
    type: String,
    enum: {
      values: ['NOT_MATURE', 'MATURE', 'UNSPECIFIED'],
      message: 'Maturity rating must be one of: NOT_MATURE, MATURE, UNSPECIFIED'
    },
    default: 'UNSPECIFIED'
  },

  format: {
    type: String,
    enum: {
      values: ['Paperback', 'Hardcover', 'E-book', 'Audiobook', 'PDF'],
      message: 'Format must be one of: Paperback, Hardcover, E-book, Audiobook, PDF'
    },
    default: 'Paperback'
  },

  dimensions: {
    height: String,
    width: String,
    thickness: String
  },

  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'oz', 'lb'],
      default: 'g'
    }
  },

  // Inventory & Availability
  stock: { 
    type: Number, 
    default: 0,
    min: [0, 'Stock cannot be negative'],
    max: [10000, 'Stock cannot exceed 10000'],
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be an integer'
    }
  },

  reserved: {
    type: Number,
    default: 0,
    min: [0, 'Reserved stock cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Reserved stock must be an integer'
    }
  },

  available: {
    type: Number,
    default: function() {
      return Math.max(0, this.stock - this.reserved);
    },
    min: 0
  },

  // Marketing & Features
  featured: { 
    type: Boolean, 
    default: false 
  },

  bestseller: { 
    type: Boolean, 
    default: false 
  },

  newRelease: { 
    type: Boolean, 
    default: false 
  },

  comingSoon: { 
    type: Boolean, 
    default: false 
  },

  // Tags & Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],

  searchKeywords: [String],

  // Google Books Metadata
  metadata: {
    googleBooksLink: String,
    previewLink: String,
    infoLink: String,
    canonicalVolumeLink: String,
    webReaderLink: String,
    pdfLink: String,
    textToSpeechPermission: String,
    epubLink: String
  },

  // Sync Information
  lastSyncedWithGoogle: Date,

  // Analytics
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },

  purchaseCount: {
    type: Number,
    default: 0,
    min: 0
  },

  wishlistCount: {
    type: Number,
    default: 0,
    min: 0
  }

}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.searchKeywords;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ========== INDEXES ==========

// Text search index for full-text search
bookSchema.index({ 
  title: 'text', 
  authors: 'text', 
  description: 'text', 
  genres: 'text',
  tags: 'text'
});

// Compound indexes for common queries
bookSchema.index({ genres: 1, averageRating: -1 });
bookSchema.index({ publicationDate: -1 });
bookSchema.index({ price: 1 });
bookSchema.index({ 'discount.isActive': 1 });
bookSchema.index({ featured: 1, bestseller: 1 });
bookSchema.index({ googleBooksId: 1 }, { sparse: true });
bookSchema.index({ averageRating: -1, ratingsCount: -1 });
bookSchema.index({ createdAt: -1 });
bookSchema.index({ viewCount: -1 });

// ========== VIRTUAL PROPERTIES ==========

// Discounted price
bookSchema.virtual('discountedPrice').get(function() {
  if (this.discount.isActive && this.discount.percentage > 0) {
    const discountAmount = this.price * (this.discount.percentage / 100);
    return Math.max(0, this.price - discountAmount);
  }
  return this.price;
});

// Saving amount
bookSchema.virtual('saving').get(function() {
  if (this.discount.isActive && this.discount.percentage > 0) {
    return this.price - this.discountedPrice;
  }
  return 0;
});

// Review count
bookSchema.virtual('reviewCount').get(function() {
  return this.reviews.length;
});

// Availability status
bookSchema.virtual('availabilityStatus').get(function() {
  if (this.available > 10) return 'In Stock';
  if (this.available > 0) return 'Low Stock';
  if (this.comingSoon) return 'Coming Soon';
  return 'Out of Stock';
});

// Age in days since publication
bookSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.publicationDate) / (1000 * 60 * 60 * 24));
});

// Is recently published (within last 90 days)
bookSchema.virtual('isRecentlyPublished').get(function() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return this.publicationDate >= ninetyDaysAgo;
});

// Popularity score (combination of ratings and views)
bookSchema.virtual('popularityScore').get(function() {
  const ratingWeight = this.averageRating * 20; // Max 100
  const reviewsWeight = Math.min(this.ratingsCount / 10, 50); // Max 50
  const viewsWeight = Math.min(this.viewCount / 100, 50); // Max 50
  return ratingWeight + reviewsWeight + viewsWeight;
});

// ========== PRE-SAVE MIDDLEWARE ==========

bookSchema.pre('save', function(next) {
  // Update available stock
  this.available = Math.max(0, this.stock - this.reserved);
  
  // Set primary author if not set
  if (this.authors.length > 0 && !this.primaryAuthor) {
    this.primaryAuthor = this.authors[0];
  }
  
  // Update search keywords for better search
  this.searchKeywords = this.generateSearchKeywords();
  
  // Auto-set newRelease based on publication date
  if (!this.newRelease && this.isRecentlyPublished) {
    this.newRelease = true;
  }

  // Update discount active status based on dates
  if (this.discount.validFrom || this.discount.validUntil) {
    const now = new Date();
    const validFrom = this.discount.validFrom || new Date(0); // Very past date
    const validUntil = this.discount.validUntil || new Date(8640000000000000); // Very future date
    
    this.discount.isActive = now >= validFrom && now <= validUntil;
  }

  next();
});

bookSchema.pre('save', function(next) {
  // Update timestamps for reviews
  if (this.isModified('reviews')) {
    this.reviews.forEach(review => {
      if (review.isModified && !review.updatedAt) {
        review.updatedAt = new Date();
      }
    });
  }
  next();
});

// ========== INSTANCE METHODS ==========

/**
 * Update average rating based on reviews
 */
bookSchema.methods.updateAverageRating = function() {
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageRating = parseFloat((totalRating / this.reviews.length).toFixed(1));
    this.ratingsCount = this.reviews.length;
  } else {
    this.averageRating = 0;
    this.ratingsCount = 0;
  }
};

/**
 * Add a review to the book
 */
bookSchema.methods.addReview = function(userId, rating, comment, title = '') {
  const review = {
    user: userId,
    rating,
    comment: comment.trim(),
    title: title.trim(),
    createdAt: new Date()
  };
  
  this.reviews.push(review);
  this.updateAverageRating();
};

/**
 * Check if user has reviewed this book
 */
bookSchema.methods.hasUserReviewed = function(userId) {
  return this.reviews.some(review => review.user.toString() === userId.toString());
};

/**
 * Mark review as helpful
 */
bookSchema.methods.markReviewHelpful = function(reviewId, userId) {
  const review = this.reviews.id(reviewId);
  if (review && !review.helpful.voters.includes(userId)) {
    review.helpful.voters.push(userId);
    review.helpful.votes = review.helpful.voters.length;
    return true;
  }
  return false;
};

/**
 * Remove helpful vote from review
 */
bookSchema.methods.removeReviewHelpful = function(reviewId, userId) {
  const review = this.reviews.id(reviewId);
  if (review) {
    const voterIndex = review.helpful.voters.indexOf(userId);
    if (voterIndex > -1) {
      review.helpful.voters.splice(voterIndex, 1);
      review.helpful.votes = review.helpful.voters.length;
      return true;
    }
  }
  return false;
};

/**
 * Generate search keywords for better search functionality
 */
bookSchema.methods.generateSearchKeywords = function() {
  const keywords = new Set();
  
  // Add title words
  if (this.title) {
    this.title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  }
  
  // Add author names
  this.authors.forEach(author => {
    author.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  });
  
  // Add genres
  this.genres.forEach(genre => {
    genre.toLowerCase()
      .split(/[/,\s]+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  });
  
  // Add publisher
  if (this.publisher) {
    this.publisher.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  }
  
  // Add tags
  this.tags.forEach(tag => {
    tag.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords);
};

/**
 * Check if book is available for purchase
 */
bookSchema.methods.isAvailable = function() {
  return this.available > 0 || this.comingSoon;
};

/**
 * Reserve a copy of the book
 */
bookSchema.methods.reserveCopy = function(quantity = 1) {
  if (this.available >= quantity) {
    this.reserved += quantity;
    this.available = Math.max(0, this.stock - this.reserved);
    return true;
  }
  return false;
};

/**
 * Release a reserved copy
 */
bookSchema.methods.releaseReservedCopy = function(quantity = 1) {
  if (this.reserved >= quantity) {
    this.reserved -= quantity;
    this.available = Math.max(0, this.stock - this.reserved);
    return true;
  }
  return false;
};

/**
 * Sell a copy (reduce stock and reserved)
 */
bookSchema.methods.sellCopy = function(quantity = 1) {
  if (this.available >= quantity) {
    this.stock -= quantity;
    this.available = Math.max(0, this.stock - this.reserved);
    this.purchaseCount += quantity;
    return true;
  }
  return false;
};

// ========== STATIC METHODS ==========

/**
 * Find book by ISBN (10 or 13)
 */
bookSchema.statics.findByISBN = function(isbn) {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  return this.findOne({
    $or: [
      { isbn: cleanISBN },
      { isbn10: cleanISBN },
      { isbn13: cleanISBN }
    ]
  });
};

/**
 * Find featured books
 */
bookSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ featured: true })
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(limit);
};

/**
 * Find bestsellers
 */
bookSchema.statics.findBestsellers = function(limit = 10) {
  return this.find({ bestseller: true })
    .sort({ averageRating: -1, ratingsCount: -1 })
    .limit(limit);
};

/**
 * Find new releases
 */
bookSchema.statics.findNewReleases = function(limit = 10) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  return this.find({ 
    publicationDate: { $gte: ninetyDaysAgo } 
  })
  .sort({ publicationDate: -1, averageRating: -1 })
  .limit(limit);
};

/**
 * Find books by genre
 */
bookSchema.statics.findByGenre = function(genre, limit = 20, page = 1) {
  return this.find({ genres: { $in: [new RegExp(genre, 'i')] } })
    .sort({ averageRating: -1, ratingsCount: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

/**
 * Search books with text and filters
 */
bookSchema.statics.search = function(query, options = {}) {
  const { 
    limit = 20, 
    page = 1, 
    genres = [], 
    minRating = 0, 
    maxPrice,
    authors = [],
    language,
    sortBy = 'relevance'
  } = options;
  
  const searchFilter = {
    $text: { $search: query }
  };
  
  const additionalFilters = {};
  
  if (genres.length > 0) {
    additionalFilters.genres = { $in: genres.map(genre => new RegExp(genre, 'i')) };
  }
  
  if (authors.length > 0) {
    additionalFilters.authors = { $in: authors.map(author => new RegExp(author, 'i')) };
  }
  
  if (minRating > 0) {
    additionalFilters.averageRating = { $gte: minRating };
  }
  
  if (maxPrice) {
    additionalFilters.price = { $lte: maxPrice };
  }
  
  if (language) {
    additionalFilters.language = language;
  }
  
  let sortOptions = {};
  
  switch (sortBy) {
    case 'relevance':
      sortOptions = { score: { $meta: 'textScore' } };
      break;
    case 'rating':
      sortOptions = { averageRating: -1, ratingsCount: -1 };
      break;
    case 'newest':
      sortOptions = { publicationDate: -1 };
      break;
    case 'price_low':
      sortOptions = { price: 1 };
      break;
    case 'price_high':
      sortOptions = { price: -1 };
      break;
    case 'popular':
      sortOptions = { viewCount: -1, purchaseCount: -1 };
      break;
    default:
      sortOptions = { score: { $meta: 'textScore' } };
  }
  
  return this.find({ ...searchFilter, ...additionalFilters })
    .select({ score: { $meta: 'textScore' } })
    .sort(sortOptions)
    .limit(limit)
    .skip((page - 1) * limit);
};

/**
 * Get similar books based on genres and authors
 */
bookSchema.statics.findSimilar = function(bookId, limit = 6) {
  return this.findById(bookId)
    .then(book => {
      if (!book) return [];
      
      return this.find({
        _id: { $ne: bookId },
        $or: [
          { genres: { $in: book.genres } },
          { authors: { $in: book.authors } }
        ]
      })
      .sort({ averageRating: -1, ratingsCount: -1 })
      .limit(limit);
    });
};

/**
 * Get trending books (based on views, purchases, and recent activity)
 */
bookSchema.statics.findTrending = function(limit = 12) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({
    $or: [
      { viewCount: { $gte: 10 } },
      { purchaseCount: { $gte: 5 } },
      { publicationDate: { $gte: thirtyDaysAgo } }
    ]
  })
  .sort({ popularityScore: -1, createdAt: -1 })
  .limit(limit);
};

/**
 * Get books by multiple IDs
 */
bookSchema.statics.findByMultipleIds = function(bookIds) {
  return this.find({
    _id: { $in: bookIds }
  });
};

/**
 * Increment view count
 */
bookSchema.statics.incrementViewCount = function(bookId) {
  return this.findByIdAndUpdate(
    bookId,
    { $inc: { viewCount: 1 } },
    { new: true }
  );
};

/**
 * Increment wishlist count
 */
bookSchema.statics.incrementWishlistCount = function(bookId) {
  return this.findByIdAndUpdate(
    bookId,
    { $inc: { wishlistCount: 1 } },
    { new: true }
  );
};

/**
 * Decrement wishlist count
 */
bookSchema.statics.decrementWishlistCount = function(bookId) {
  return this.findByIdAndUpdate(
    bookId,
    { $inc: { wishlistCount: -1 } },
    { new: true }
  );
};

// ========== QUERY HELPERS ==========

// Add query helper for price range
bookSchema.query.byPriceRange = function(min, max) {
  return this.where('price').gte(min).lte(max);
};

// Add query helper for rating
bookSchema.query.byRating = function(minRating) {
  return this.where('averageRating').gte(minRating);
};

// Add query helper for genre
bookSchema.query.byGenre = function(genre) {
  return this.where('genres').in([new RegExp(genre, 'i')]);
};

// Add query helper for author
bookSchema.query.byAuthor = function(author) {
  return this.where('authors').in([new RegExp(author, 'i')]);
};

// Add query helper for availability
bookSchema.query.available = function() {
  return this.where('available').gt(0);
};

// Add query helper for featured books
bookSchema.query.featured = function() {
  return this.where('featured').equals(true);
};

// ========== AGGREGATION METHODS ==========

/**
 * Get genre statistics
 */
bookSchema.statics.getGenreStats = function() {
  return this.aggregate([
    { $unwind: '$genres' },
    {
      $group: {
        _id: '$genres',
        bookCount: { $sum: 1 },
        averageRating: { $avg: '$averageRating' },
        totalViews: { $sum: '$viewCount' }
      }
    },
    { $sort: { bookCount: -1 } }
  ]);
};

/**
 * Get author statistics
 */
bookSchema.statics.getAuthorStats = function() {
  return this.aggregate([
    { $unwind: '$authors' },
    {
      $group: {
        _id: '$authors',
        bookCount: { $sum: 1 },
        averageRating: { $avg: '$averageRating' },
        totalBooksSold: { $sum: '$purchaseCount' }
      }
    },
    { $sort: { bookCount: -1 } },
    { $limit: 50 }
  ]);
};

export default mongoose.model('Book', bookSchema);