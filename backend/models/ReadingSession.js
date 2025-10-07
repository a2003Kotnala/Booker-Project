import mongoose from 'mongoose';

/**
 * Reading Session Model
 * Tracks user reading sessions, progress, notes, and reading statistics
 */

const readingNoteSchema = new mongoose.Schema({
  page: {
    type: Number,
    required: [true, 'Page number is required'],
    min: [0, 'Page number cannot be negative']
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxlength: [1000, 'Note cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const readingSessionSchema = new mongoose.Schema({
  // User and Book References
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },

  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book reference is required'],
    index: true
  },

  // Session Status and Timing
  status: {
    type: String,
    enum: {
      values: ['active', 'paused', 'completed', 'abandoned', 'viewed'],
      message: 'Status must be one of: active, paused, completed, abandoned, viewed'
    },
    default: 'active',
    index: true
  },

  startTime: {
    type: Date,
    default: Date.now,
    required: [true, 'Start time is required']
  },

  endTime: {
    type: Date
  },

  pausedAt: {
    type: Date
  },

  resumedAt: {
    type: Date
  },

  lastReadAt: {
    type: Date,
    default: Date.now
  },

  // Reading Progress
  startPage: {
    type: Number,
    default: 0,
    min: [0, 'Start page cannot be negative']
  },

  currentPage: {
    type: Number,
    default: 0,
    min: [0, 'Current page cannot be negative'],
    validate: {
      validator: function(v) {
        return v >= this.startPage;
      },
      message: 'Current page cannot be less than start page'
    }
  },

  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100%'],
    set: function(v) {
      return Math.round(v * 100) / 100; // Round to 2 decimal places
    }
  },

  // Reading Statistics
  totalReadingTime: {
    type: Number, // in seconds
    default: 0,
    min: [0, 'Reading time cannot be negative']
  },

  pagesRead: {
    type: Number,
    default: 0,
    min: [0, 'Pages read cannot be negative']
  },

  sessionCount: {
    type: Number,
    default: 1,
    min: [1, 'Session count must be at least 1']
  },

  readingSpeed: {
    type: Number, // pages per hour
    default: 0,
    min: [0, 'Reading speed cannot be negative']
  },

  // User Interaction
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },

  lastViewedAt: {
    type: Date
  },

  // Completion Details
  finalRating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },

  finalReview: {
    type: String,
    maxlength: [2000, 'Review cannot exceed 2000 characters'],
    trim: true
  },

  completedAt: {
    type: Date
  },

  // Reading Experience
  notes: [readingNoteSchema],

  bookmarks: [{
    page: {
      type: Number,
      required: true,
      min: [0, 'Bookmark page cannot be negative']
    },
    note: {
      type: String,
      maxlength: [200, 'Bookmark note cannot exceed 200 characters'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  highlights: [{
    page: {
      type: Number,
      required: true,
      min: [0, 'Highlight page cannot be negative']
    },
    text: {
      type: String,
      required: [true, 'Highlight text is required'],
      maxlength: [1000, 'Highlight text cannot exceed 1000 characters'],
      trim: true
    },
    color: {
      type: String,
      default: '#FFEB3B',
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code']
    },
    note: {
      type: String,
      maxlength: [500, 'Highlight note cannot exceed 500 characters'],
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Session Metadata
  deviceInfo: {
    type: {
      type: String,
      enum: ['web', 'mobile', 'tablet', 'ereader'],
      default: 'web'
    },
    userAgent: String,
    platform: String,
    screenSize: {
      width: Number,
      height: Number
    }
  },

  readingPreferences: {
    fontSize: {
      type: Number,
      default: 16,
      min: [8, 'Font size must be at least 8'],
      max: [72, 'Font size cannot exceed 72']
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'sepia'],
      default: 'light'
    },
    lineHeight: {
      type: Number,
      default: 1.5,
      min: [1, 'Line height must be at least 1'],
      max: [3, 'Line height cannot exceed 3']
    }
  },

  // Analytics and Insights
  readingPatterns: {
    averageSessionTime: {
      type: Number, // in seconds
      default: 0,
      min: 0
    },
    preferredReadingTime: {
      start: String, // HH:MM format
      end: String    // HH:MM format
    },
    mostActiveDays: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      sessions: {
        type: Number,
        default: 0,
        min: 0
      }
    }]
  },

  // Sync and Versioning
  lastSyncedAt: {
    type: Date
  },

  syncVersion: {
    type: Number,
    default: 1
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

// Compound indexes for efficient queries
readingSessionSchema.index({ user: 1, book: 1 });
readingSessionSchema.index({ user: 1, status: 1 });
readingSessionSchema.index({ user: 1, lastReadAt: -1 });
readingSessionSchema.index({ book: 1, status: 1 });
readingSessionSchema.index({ status: 1, lastReadAt: -1 });
readingSessionSchema.index({ user: 1, completedAt: -1 });
readingSessionSchema.index({ startTime: -1 });
readingSessionSchema.index({ 'readingPatterns.preferredReadingTime.start': 1 });

// Text search index for notes and highlights
readingSessionSchema.index({ 
  'notes.content': 'text', 
  'highlights.text': 'text',
  'highlights.note': 'text'
});

// ========== VIRTUAL PROPERTIES ==========

// Session duration (in seconds)
readingSessionSchema.virtual('duration').get(function() {
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime - this.startTime) / 1000);
  }
  return 0;
});

// Active reading time (excluding pauses)
readingSessionSchema.virtual('activeReadingTime').get(function() {
  return this.totalReadingTime;
});

// Pages per minute
readingSessionSchema.virtual('readingPace').get(function() {
  if (this.totalReadingTime > 0 && this.pagesRead > 0) {
    return (this.pagesRead / (this.totalReadingTime / 60)).toFixed(2);
  }
  return 0;
});

// Estimated time to complete book
readingSessionSchema.virtual('estimatedTimeRemaining').get(function() {
  if (this.readingPace > 0 && this.progress < 100) {
    const pagesRemaining = this.pagesRemaining;
    return Math.round(pagesRemaining / this.readingPace * 60); // in seconds
  }
  return 0;
});

// Pages remaining
readingSessionSchema.virtual('pagesRemaining').get(function() {
  // This would require book population to get total pages
  // For now, we'll assume it's calculated elsewhere
  return 0;
});

// Is session active
readingSessionSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Is session completed
readingSessionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Session age in days
readingSessionSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.startTime) / (1000 * 60 * 60 * 24));
});

// Recent activity (within last 7 days)
readingSessionSchema.virtual('isRecentlyActive').get(function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.lastReadAt >= sevenDaysAgo;
});

// Completion rate (for abandoned sessions)
readingSessionSchema.virtual('completionRate').get(function() {
  return this.progress;
});

// ========== PRE-SAVE MIDDLEWARE ==========

readingSessionSchema.pre('save', function(next) {
  // Update last read timestamp when progress changes
  if (this.isModified('currentPage') || this.isModified('progress')) {
    this.lastReadAt = new Date();
  }

  // Calculate progress based on current page and book pages
  // This would be better handled in the controller with book population
  if (this.isModified('currentPage')) {
    // Progress calculation will be handled by the controller
    // We'll keep progress field for direct updates
  }

  // Update reading speed if we have reading time and pages
  if (this.totalReadingTime > 0 && this.pagesRead > 0) {
    const hours = this.totalReadingTime / 3600; // Convert seconds to hours
    this.readingSpeed = hours > 0 ? this.pagesRead / hours : 0;
  }

  // Update end time for completed sessions
  if (this.status === 'completed' && !this.endTime) {
    this.endTime = new Date();
    this.completedAt = new Date();
  }

  // Update note updatedAt
  if (this.isModified('notes')) {
    this.notes.forEach(note => {
      if (note.isModified) {
        note.updatedAt = new Date();
      }
    });
  }

  next();
});

// ========== INSTANCE METHODS ==========

/**
 * Update reading progress
 */
readingSessionSchema.methods.updateProgress = function(currentPage, totalPages, readingTime = 0) {
  const previousPage = this.currentPage;
  
  this.currentPage = Math.max(this.startPage, Math.min(totalPages, currentPage));
  
  // Calculate progress percentage
  if (totalPages > 0) {
    this.progress = Math.round((this.currentPage / totalPages) * 100);
  }

  // Calculate pages read in this update
  const pagesReadThisUpdate = Math.max(0, this.currentPage - previousPage);
  this.pagesRead += pagesReadThisUpdate;

  // Add reading time
  if (readingTime > 0) {
    this.totalReadingTime += readingTime;
  }

  this.lastReadAt = new Date();
  
  return this.save();
};

/**
 * Pause the reading session
 */
readingSessionSchema.methods.pause = function() {
  if (this.status !== 'active') {
    throw new Error('Only active sessions can be paused');
  }

  this.status = 'paused';
  this.pausedAt = new Date();
  
  return this.save();
};

/**
 * Resume the reading session
 */
readingSessionSchema.methods.resume = function() {
  if (this.status !== 'paused') {
    throw new Error('Only paused sessions can be resumed');
  }

  this.status = 'active';
  this.resumedAt = new Date();
  this.lastReadAt = new Date();
  
  return this.save();
};

/**
 * Complete the reading session
 */
readingSessionSchema.methods.complete = function(rating = null, review = '') {
  this.status = 'completed';
  this.endTime = new Date();
  this.completedAt = new Date();
  this.progress = 100;

  if (rating !== null) {
    this.finalRating = rating;
  }

  if (review) {
    this.finalReview = review;
  }

  return this.save();
};

/**
 * Abandon the reading session
 */
readingSessionSchema.methods.abandon = function() {
  this.status = 'abandoned';
  this.endTime = new Date();
  
  return this.save();
};

/**
 * Add a reading note
 */
readingSessionSchema.methods.addNote = function(page, content) {
  const note = {
    page,
    content: content.trim(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.notes.push(note);
  return this.save();
};

/**
 * Update a reading note
 */
readingSessionSchema.methods.updateNote = function(noteId, content) {
  const note = this.notes.id(noteId);
  if (!note) {
    throw new Error('Note not found');
  }

  note.content = content.trim();
  note.updatedAt = new Date();
  
  return this.save();
};

/**
 * Delete a reading note
 */
readingSessionSchema.methods.deleteNote = function(noteId) {
  const noteIndex = this.notes.findIndex(note => note._id.toString() === noteId);
  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  this.notes.splice(noteIndex, 1);
  return this.save();
};

/**
 * Add a bookmark
 */
readingSessionSchema.methods.addBookmark = function(page, note = '') {
  const bookmark = {
    page,
    note: note.trim(),
    createdAt: new Date()
  };

  // Remove existing bookmark at same page
  this.bookmarks = this.bookmarks.filter(bm => bm.page !== page);
  this.bookmarks.push(bookmark);
  
  return this.save();
};

/**
 * Remove a bookmark
 */
readingSessionSchema.methods.removeBookmark = function(page) {
  this.bookmarks = this.bookmarks.filter(bm => bm.page !== page);
  return this.save();
};

/**
 * Add a highlight
 */
readingSessionSchema.methods.addHighlight = function(page, text, color = '#FFEB3B', note = '') {
  const highlight = {
    page,
    text: text.trim(),
    color,
    note: note.trim(),
    createdAt: new Date()
  };

  this.highlights.push(highlight);
  return this.save();
};

/**
 * Remove a highlight
 */
readingSessionSchema.methods.removeHighlight = function(highlightId) {
  const highlightIndex = this.highlights.findIndex(hl => hl._id.toString() === highlightId);
  if (highlightIndex === -1) {
    throw new Error('Highlight not found');
  }

  this.highlights.splice(highlightIndex, 1);
  return this.save();
};

/**
 * Increment view count
 */
readingSessionSchema.methods.incrementView = function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  
  return this.save();
};

/**
 * Calculate reading statistics for this session
 */
readingSessionSchema.methods.getReadingStats = function() {
  return {
    totalPages: this.pagesRead,
    totalTime: this.totalReadingTime,
    averageSpeed: this.readingSpeed,
    progress: this.progress,
    sessionCount: this.sessionCount,
    notesCount: this.notes.length,
    bookmarksCount: this.bookmarks.length,
    highlightsCount: this.highlights.length
  };
};

/**
 * Check if session can be resumed
 */
readingSessionSchema.methods.canResume = function() {
  return this.status === 'paused' && this.progress < 100;
};

/**
 * Check if session is recently viewed
 */
readingSessionSchema.methods.isRecentlyViewed = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.lastViewedAt && this.lastViewedAt >= cutoffDate;
};

// ========== STATIC METHODS ==========

/**
 * Find active reading sessions for a user
 */
readingSessionSchema.statics.findActiveSessions = function(userId, limit = 10) {
  return this.find({
    user: userId,
    status: { $in: ['active', 'paused'] }
  })
  .populate('book', 'title author coverImage pageCount genres')
  .sort({ lastReadAt: -1 })
  .limit(limit);
};

/**
 * Find completed reading sessions for a user
 */
readingSessionSchema.statics.findCompletedSessions = function(userId, limit = 20, page = 1) {
  return this.find({
    user: userId,
    status: 'completed'
  })
  .populate('book', 'title author coverImage pageCount genres averageRating')
  .sort({ completedAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
};

/**
 * Find reading sessions by book and user
 */
readingSessionSchema.statics.findByUserAndBook = function(userId, bookId) {
  return this.find({
    user: userId,
    book: bookId
  })
  .populate('book', 'title author coverImage pageCount')
  .sort({ startTime: -1 });
};

/**
 * Get user's reading statistics
 */
readingSessionSchema.statics.getUserReadingStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$user',
        totalBooksRead: { $sum: 1 },
        totalPagesRead: { $sum: '$pagesRead' },
        totalReadingTime: { $sum: '$totalReadingTime' },
        averageRating: { $avg: '$finalRating' },
        totalSessions: { $sum: '$sessionCount' },
        averageReadingSpeed: { $avg: '$readingSpeed' }
      }
    }
  ]);
};

/**
 * Get reading sessions by date range
 */
readingSessionSchema.statics.findByDateRange = function(userId, startDate, endDate) {
  return this.find({
    user: userId,
    lastReadAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  })
  .populate('book', 'title author coverImage')
  .sort({ lastReadAt: 1 });
};

/**
 * Get recently active sessions across all users
 */
readingSessionSchema.statics.findRecentlyActive = function(limit = 50) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return this.find({
    lastReadAt: { $gte: sevenDaysAgo },
    status: { $in: ['active', 'paused'] }
  })
  .populate('user', 'username profile avatar')
  .populate('book', 'title author coverImage')
  .sort({ lastReadAt: -1 })
  .limit(limit);
};

/**
 * Get popular books being read
 */
readingSessionSchema.statics.getPopularBooks = function(limit = 10) {
  return this.aggregate([
    {
      $match: {
        status: { $in: ['active', 'paused'] }
      }
    },
    {
      $group: {
        _id: '$book',
        activeReaders: { $sum: 1 },
        totalSessions: { $sum: 1 },
        averageProgress: { $avg: '$progress' }
      }
    },
    {
      $sort: { activeReaders: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: '_id',
        as: 'book'
      }
    },
    {
      $unwind: '$book'
    },
    {
      $project: {
        'book.title': 1,
        'book.author': 1,
        'book.coverImage': 1,
        'book.genres': 1,
        activeReaders: 1,
        totalSessions: 1,
        averageProgress: 1
      }
    }
  ]);
};

/**
 * Get reading streak for a user
 */
readingSessionSchema.statics.getReadingStreak = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: userId,
        lastReadAt: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$lastReadAt' },
          month: { $month: '$lastReadAt' },
          day: { $dayOfMonth: '$lastReadAt' }
        },
        read: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    }
  ]);
};

/**
 * Delete all sessions for a user (for account deletion)
 */
readingSessionSchema.statics.deleteUserSessions = function(userId) {
  return this.deleteMany({ user: userId });
};

/**
 * Delete all sessions for a book (for book deletion)
 */
readingSessionSchema.statics.deleteBookSessions = function(bookId) {
  return this.deleteMany({ book: bookId });
};

// ========== QUERY HELPERS ==========

// Query helper for active sessions
readingSessionSchema.query.active = function() {
  return this.where('status').equals('active');
};

// Query helper for completed sessions
readingSessionSchema.query.completed = function() {
  return this.where('status').equals('completed');
};

// Query helper for sessions with progress above threshold
readingSessionSchema.query.minProgress = function(progress) {
  return this.where('progress').gte(progress);
};

// Query helper for sessions with progress below threshold
readingSessionSchema.query.maxProgress = function(progress) {
  return this.where('progress').lte(progress);
};

// Query helper for sessions in date range
readingSessionSchema.query.inDateRange = function(startDate, endDate) {
  return this.where('lastReadAt').gte(startDate).lte(endDate);
};

// Query helper for sessions with notes
readingSessionSchema.query.hasNotes = function() {
  return this.where('notes').ne([]);
};

// ========== AGGREGATION METHODS ==========

/**
 * Get reading patterns for a user
 */
readingSessionSchema.statics.getReadingPatterns = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: userId,
        lastReadAt: { $exists: true }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$lastReadAt' },
          dayOfWeek: { $dayOfWeek: '$lastReadAt' }
        },
        sessionCount: { $sum: 1 },
        totalReadingTime: { $sum: '$totalReadingTime' },
        averageProgress: { $avg: '$progress' }
      }
    },
    {
      $sort: { sessionCount: -1 }
    }
  ]);
};

/**
 * Get reading statistics by genre for a user
 */
readingSessionSchema.statics.getGenreStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed'
      }
    },
    {
      $lookup: {
        from: 'books',
        localField: 'book',
        foreignField: '_id',
        as: 'bookData'
      }
    },
    {
      $unwind: '$bookData'
    },
    {
      $unwind: '$bookData.genres'
    },
    {
      $group: {
        _id: '$bookData.genres',
        booksRead: { $sum: 1 },
        totalPages: { $sum: '$pagesRead' },
        totalTime: { $sum: '$totalReadingTime' },
        averageRating: { $avg: '$finalRating' },
        averageProgress: { $avg: '$progress' }
      }
    },
    {
      $sort: { booksRead: -1 }
    }
  ]);
};

export default mongoose.model('ReadingSession', readingSessionSchema);