import mongoose from 'mongoose';

/**
 * Bookshelf Model
 * Represents a user's personal bookshelf with different categories (Currently Reading, Want to Read, Finished)
 */

const bookshelfItemSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book reference is required']
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  },
  currentPage: {
    type: Number,
    default: 0,
    min: [0, 'Current page cannot be negative']
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100%']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },
  review: {
    type: String,
    maxlength: [2000, 'Review cannot exceed 2000 characters'],
    trim: true
  },
  completedAt: {
    type: Date
  },
  readingTime: {
    type: Number,
    default: 0,
    min: [0, 'Reading time cannot be negative']
  },
  notes: [{
    page: {
      type: Number,
      required: true,
      min: [0, 'Page number cannot be negative']
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      maxlength: [1000, 'Note cannot exceed 1000 characters'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const bookshelfSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true,
    index: true
  },
  
  // Main Bookshelf Categories
  currentlyReading: [bookshelfItemSchema],
  wantToRead: [bookshelfItemSchema],
  finished: [bookshelfItemSchema],
  
  // Custom Shelves
  customShelves: [{
    name: {
      type: String,
      required: [true, 'Shelf name is required'],
      trim: true,
      maxlength: [50, 'Shelf name cannot exceed 50 characters']
    },
    description: {
      type: String,
      maxlength: [200, 'Shelf description cannot exceed 200 characters'],
      trim: true
    },
    color: {
      type: String,
      default: '#6a11cb',
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code']
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    books: [bookshelfItemSchema],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reading Statistics
  statistics: {
    totalBooksRead: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPagesRead: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReadingTime: {
      type: Number,
      default: 0,
      min: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    readingStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    favoriteGenres: [{
      genre: String,
      count: {
        type: Number,
        default: 0,
        min: 0
      }
    }],
    favoriteAuthors: [{
      author: String,
      count: {
        type: Number,
        default: 0,
        min: 0
      }
    }]
  },
  
  // Reading Goals
  readingGoals: {
    yearly: {
      year: {
        type: Number,
        default: () => new Date().getFullYear()
      },
      booksGoal: {
        type: Number,
        default: 12,
        min: [1, 'Books goal must be at least 1'],
        max: [1000, 'Books goal cannot exceed 1000']
      },
      pagesGoal: {
        type: Number,
        default: 3650, // 10 pages per day average
        min: [1, 'Pages goal must be at least 1'],
        max: [365000, 'Pages goal cannot exceed 365000']
      },
      booksCompleted: {
        type: Number,
        default: 0,
        min: 0
      },
      pagesCompleted: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    monthly: {
      month: {
        type: Number,
        default: () => new Date().getMonth() + 1
      },
      year: {
        type: Number,
        default: () => new Date().getFullYear()
      },
      booksGoal: {
        type: Number,
        default: 1,
        min: 0,
        max: 100
      },
      pagesGoal: {
        type: Number,
        default: 300,
        min: 0,
        max: 10000
      },
      booksCompleted: {
        type: Number,
        default: 0,
        min: 0
      },
      pagesCompleted: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  
  // Preferences
  preferences: {
    defaultShelfView: {
      type: String,
      enum: ['grid', 'list', 'cover'],
      default: 'grid'
    },
    sortBy: {
      type: String,
      enum: ['title', 'author', 'dateAdded', 'progress', 'rating'],
      default: 'dateAdded'
    },
    sortOrder: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    showRatings: {
      type: Boolean,
      default: true
    },
    autoMarkComplete: {
      type: Boolean,
      default: true
    },
    completionThreshold: {
      type: Number,
      default: 95,
      min: 50,
      max: 100
    }
  },
  
  // Metadata
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  bookshelfCreatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ========== INDEXES ==========

// Index for user queries
bookshelfSchema.index({ user: 1 });

// Compound indexes for efficient shelf queries
bookshelfSchema.index({ 'currentlyReading.lastReadAt': -1 });
bookshelfSchema.index({ 'wantToRead.addedAt': -1 });
bookshelfSchema.index({ 'finished.completedAt': -1 });

// Index for statistics
bookshelfSchema.index({ 'statistics.totalBooksRead': -1 });

// ========== VIRTUAL PROPERTIES ==========

// Total books count
bookshelfSchema.virtual('totalBooksCount').get(function() {
  return this.currentlyReading.length + this.wantToRead.length + this.finished.length;
});

// Currently reading count
bookshelfSchema.virtual('currentlyReadingCount').get(function() {
  return this.currentlyReading.length;
});

// Want to read count
bookshelfSchema.virtual('wantToReadCount').get(function() {
  return this.wantToRead.length;
});

// Finished books count
bookshelfSchema.virtual('finishedCount').get(function() {
  return this.finished.length;
});

// Custom shelves count
bookshelfSchema.virtual('customShelvesCount').get(function() {
  return this.customShelves.length;
});

// Yearly goals progress
bookshelfSchema.virtual('yearlyGoalsProgress').get(function() {
  const booksProgress = this.readingGoals.yearly.booksGoal > 0 
    ? (this.readingGoals.yearly.booksCompleted / this.readingGoals.yearly.booksGoal) * 100 
    : 0;
  
  const pagesProgress = this.readingGoals.yearly.pagesGoal > 0 
    ? (this.readingGoals.yearly.pagesCompleted / this.readingGoals.yearly.pagesGoal) * 100 
    : 0;
  
  return {
    books: {
      completed: this.readingGoals.yearly.booksCompleted,
      goal: this.readingGoals.yearly.booksGoal,
      progress: Math.min(100, Math.round(booksProgress))
    },
    pages: {
      completed: this.readingGoals.yearly.pagesCompleted,
      goal: this.readingGoals.yearly.pagesGoal,
      progress: Math.min(100, Math.round(pagesProgress))
    }
  };
});

// Monthly goals progress
bookshelfSchema.virtual('monthlyGoalsProgress').get(function() {
  const booksProgress = this.readingGoals.monthly.booksGoal > 0 
    ? (this.readingGoals.monthly.booksCompleted / this.readingGoals.monthly.booksGoal) * 100 
    : 0;
  
  const pagesProgress = this.readingGoals.monthly.pagesGoal > 0 
    ? (this.readingGoals.monthly.pagesCompleted / this.readingGoals.monthly.pagesGoal) * 100 
    : 0;
  
  return {
    books: {
      completed: this.readingGoals.monthly.booksCompleted,
      goal: this.readingGoals.monthly.booksGoal,
      progress: Math.min(100, Math.round(booksProgress))
    },
    pages: {
      completed: this.readingGoals.monthly.pagesCompleted,
      goal: this.readingGoals.monthly.pagesGoal,
      progress: Math.min(100, Math.round(pagesProgress))
    }
  };
});

// Reading stats summary
bookshelfSchema.virtual('readingStats').get(function() {
  return {
    totalBooks: this.statistics.totalBooksRead,
    totalPages: this.statistics.totalPagesRead,
    totalTime: this.statistics.totalReadingTime,
    averageRating: this.statistics.averageRating,
    readingStreak: this.statistics.readingStreak,
    currentStreak: this.statistics.currentStreak,
    longestStreak: this.statistics.longestStreak
  };
});

// ========== PRE-SAVE MIDDLEWARE ==========

bookshelfSchema.pre('save', function(next) {
  // Update last activity timestamp
  this.lastActivityAt = new Date();
  
  // Update custom shelves updatedAt
  this.customShelves.forEach(shelf => {
    shelf.updatedAt = new Date();
  });
  
  // Calculate statistics
  this.calculateStatistics();
  
  next();
});

// ========== INSTANCE METHODS ==========

/**
 * Add a book to a specific shelf
 */
bookshelfSchema.methods.addToShelf = function(bookId, shelfType, customShelfName = null) {
  const bookItem = {
    book: bookId,
    addedAt: new Date()
  };

  // Remove from other shelves first
  this.removeFromAllShelves(bookId);

  if (customShelfName) {
    // Add to custom shelf
    const customShelf = this.customShelves.find(shelf => shelf.name === customShelfName);
    if (customShelf) {
      customShelf.books.push(bookItem);
      customShelf.updatedAt = new Date();
    } else {
      throw new Error(`Custom shelf '${customShelfName}' not found`);
    }
  } else {
    // Add to main shelf
    switch (shelfType) {
      case 'currentlyReading':
        bookItem.startedAt = new Date();
        bookItem.lastReadAt = new Date();
        this.currentlyReading.push(bookItem);
        break;
      case 'wantToRead':
        this.wantToRead.push(bookItem);
        break;
      case 'finished':
        bookItem.completedAt = new Date();
        bookItem.progress = 100;
        this.finished.push(bookItem);
        this.updateReadingGoals('bookCompleted');
        break;
      default:
        throw new Error(`Invalid shelf type: ${shelfType}`);
    }
  }

  return this.save();
};

/**
 * Remove a book from all shelves
 */
bookshelfSchema.methods.removeFromAllShelves = function(bookId) {
  this.currentlyReading = this.currentlyReading.filter(item => 
    item.book.toString() !== bookId.toString()
  );
  this.wantToRead = this.wantToRead.filter(item => 
    item.book.toString() !== bookId.toString()
  );
  this.finished = this.finished.filter(item => 
    item.book.toString() !== bookId.toString()
  );
  
  // Remove from custom shelves
  this.customShelves.forEach(shelf => {
    shelf.books = shelf.books.filter(item => 
      item.book.toString() !== bookId.toString()
    );
  });
};

/**
 * Move a book between shelves
 */
bookshelfSchema.methods.moveBook = function(bookId, fromShelf, toShelf, customShelfFrom = null, customShelfTo = null) {
  let bookItem = null;

  // Find and remove from source shelf
  if (customShelfFrom) {
    const fromCustomShelf = this.customShelves.find(shelf => shelf.name === customShelfFrom);
    if (fromCustomShelf) {
      const itemIndex = fromCustomShelf.books.findIndex(item => 
        item.book.toString() === bookId.toString()
      );
      if (itemIndex > -1) {
        bookItem = fromCustomShelf.books[itemIndex];
        fromCustomShelf.books.splice(itemIndex, 1);
        fromCustomShelf.updatedAt = new Date();
      }
    }
  } else {
    const sourceShelf = this.getShelf(fromShelf);
    const itemIndex = sourceShelf.findIndex(item => 
      item.book.toString() === bookId.toString()
    );
    if (itemIndex > -1) {
      bookItem = sourceShelf[itemIndex];
      sourceShelf.splice(itemIndex, 1);
    }
  }

  if (!bookItem) {
    throw new Error('Book not found in source shelf');
  }

  // Update book item based on destination shelf
  bookItem.addedAt = new Date();

  if (toShelf === 'currentlyReading' && !bookItem.startedAt) {
    bookItem.startedAt = new Date();
  } else if (toShelf === 'finished') {
    bookItem.completedAt = new Date();
    bookItem.progress = 100;
    this.updateReadingGoals('bookCompleted');
  }

  // Add to destination shelf
  if (customShelfTo) {
    const toCustomShelf = this.customShelves.find(shelf => shelf.name === customShelfTo);
    if (toCustomShelf) {
      toCustomShelf.books.push(bookItem);
      toCustomShelf.updatedAt = new Date();
    } else {
      throw new Error(`Destination custom shelf '${customShelfTo}' not found`);
    }
  } else {
    const destinationShelf = this.getShelf(toShelf);
    destinationShelf.push(bookItem);
  }

  return this.save();
};

/**
 * Update reading progress for a book
 */
bookshelfSchema.methods.updateReadingProgress = function(bookId, currentPage, totalPages, readingTime = 0) {
  const bookItem = this.findBookInShelves(bookId);
  
  if (!bookItem) {
    throw new Error('Book not found in any shelf');
  }

  bookItem.currentPage = currentPage;
  bookItem.progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  bookItem.lastReadAt = new Date();
  bookItem.readingTime += readingTime;

  // Auto-mark as completed if progress threshold is reached
  if (this.preferences.autoMarkComplete && 
      bookItem.progress >= this.preferences.completionThreshold && 
      !bookItem.completedAt) {
    this.moveBook(bookId, 'currentlyReading', 'finished');
  }

  // Update reading goals
  this.updateReadingGoals('pagesRead', currentPage - (bookItem.previousPage || 0));

  return this.save();
};

/**
 * Add a rating and review to a book
 */
bookshelfSchema.methods.addRating = function(bookId, rating, review = '') {
  const bookItem = this.findBookInShelves(bookId);
  
  if (!bookItem) {
    throw new Error('Book not found in any shelf');
  }

  bookItem.rating = rating;
  if (review) {
    bookItem.review = review;
  }

  this.calculateStatistics();
  return this.save();
};

/**
 * Create a custom shelf
 */
bookshelfSchema.methods.createCustomShelf = function(name, description = '', color = '#6a11cb', isPublic = false) {
  const existingShelf = this.customShelves.find(shelf => shelf.name === name);
  if (existingShelf) {
    throw new Error(`Shelf '${name}' already exists`);
  }

  this.customShelves.push({
    name,
    description,
    color,
    isPublic,
    books: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return this.save();
};

/**
 * Delete a custom shelf
 */
bookshelfSchema.methods.deleteCustomShelf = function(shelfName) {
  const shelfIndex = this.customShelves.findIndex(shelf => shelf.name === shelfName);
  if (shelfIndex === -1) {
    throw new Error(`Shelf '${shelfName}' not found`);
  }

  this.customShelves.splice(shelfIndex, 1);
  return this.save();
};

/**
 * Calculate reading statistics
 */
bookshelfSchema.methods.calculateStatistics = function() {
  // Calculate total books read
  this.statistics.totalBooksRead = this.finished.length;

  // Calculate total pages read and average rating
  let totalPages = 0;
  let totalRating = 0;
  let ratedBooks = 0;

  this.finished.forEach(item => {
    // This would require populating the book to get pageCount
    // For now, we'll assume pageCount is stored in the bookshelf item
    if (item.currentPage) {
      totalPages += item.currentPage;
    }
    
    if (item.rating) {
      totalRating += item.rating;
      ratedBooks++;
    }
  });

  this.statistics.totalPagesRead = totalPages;
  this.statistics.averageRating = ratedBooks > 0 ? totalRating / ratedBooks : 0;

  // Calculate favorite genres and authors
  // This would require book population, so we'll update this when books are populated
};

/**
 * Update reading goals
 */
bookshelfSchema.methods.updateReadingGoals = function(type, value = 1) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Update yearly goals if current year matches
  if (this.readingGoals.yearly.year === currentYear) {
    if (type === 'bookCompleted') {
      this.readingGoals.yearly.booksCompleted += value;
    } else if (type === 'pagesRead') {
      this.readingGoals.yearly.pagesCompleted += value;
    }
  }

  // Update monthly goals if current month matches
  if (this.readingGoals.monthly.year === currentYear && this.readingGoals.monthly.month === currentMonth) {
    if (type === 'bookCompleted') {
      this.readingGoals.monthly.booksCompleted += value;
    } else if (type === 'pagesRead') {
      this.readingGoals.monthly.pagesCompleted += value;
    }
  }
};

/**
 * Find a book in any shelf
 */
bookshelfSchema.methods.findBookInShelves = function(bookId) {
  // Check main shelves
  const mainShelves = [...this.currentlyReading, ...this.wantToRead, ...this.finished];
  let bookItem = mainShelves.find(item => item.book.toString() === bookId.toString());

  // Check custom shelves if not found in main shelves
  if (!bookItem) {
    for (const shelf of this.customShelves) {
      bookItem = shelf.books.find(item => item.book.toString() === bookId.toString());
      if (bookItem) break;
    }
  }

  return bookItem;
};

/**
 * Get shelf array by type
 */
bookshelfSchema.methods.getShelf = function(shelfType) {
  switch (shelfType) {
    case 'currentlyReading':
      return this.currentlyReading;
    case 'wantToRead':
      return this.wantToRead;
    case 'finished':
      return this.finished;
    default:
      throw new Error(`Invalid shelf type: ${shelfType}`);
  }
};

/**
 * Add note to a book
 */
bookshelfSchema.methods.addNote = function(bookId, page, content) {
  const bookItem = this.findBookInShelves(bookId);
  
  if (!bookItem) {
    throw new Error('Book not found in any shelf');
  }

  if (!bookItem.notes) {
    bookItem.notes = [];
  }

  bookItem.notes.push({
    page,
    content,
    createdAt: new Date()
  });

  return this.save();
};

// ========== STATIC METHODS ==========

/**
 * Find bookshelf by user ID
 */
bookshelfSchema.statics.findByUserId = function(userId) {
  return this.findOne({ user: userId })
    .populate('currentlyReading.book')
    .populate('wantToRead.book')
    .populate('finished.book')
    .populate('customShelves.books.book');
};

/**
 * Get user's reading statistics
 */
bookshelfSchema.statics.getUserStatistics = function(userId) {
  return this.findOne({ user: userId })
    .select('statistics readingGoals')
    .then(bookshelf => {
      if (!bookshelf) {
        return {
          totalBooksRead: 0,
          totalPagesRead: 0,
          totalReadingTime: 0,
          averageRating: 0,
          readingStreak: 0
        };
      }
      return bookshelf.statistics;
    });
};

/**
 * Get users with most books read
 */
bookshelfSchema.statics.getTopReaders = function(limit = 10) {
  return this.find()
    .populate('user', 'username profile avatar')
    .sort({ 'statistics.totalBooksRead': -1 })
    .limit(limit)
    .select('user statistics');
};

export default mongoose.model('Bookshelf', bookshelfSchema);