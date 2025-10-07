import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * User Model
 * Represents a user in the BookifyMe system with authentication, profile, and reading data
 */

const userProfileSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  avatar: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please provide a valid URL for the avatar'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, 'Website cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please provide a valid URL for the website'
    }
  },
  birthDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return v <= new Date() && v >= new Date('1900-01-01');
      },
      message: 'Birth date must be between 1900 and current date'
    }
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
      message: 'Gender must be one of: male, female, non-binary, prefer-not-to-say'
    }
  }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const userPreferencesSchema = new mongoose.Schema({
  // Reading Preferences
  favoriteGenres: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Genre cannot exceed 50 characters']
  }],
  favoriteAuthors: [{
    type: String,
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  }],
  readingGoals: {
    booksPerYear: {
      type: Number,
      default: 12,
      min: [1, 'Books per year must be at least 1'],
      max: [1000, 'Books per year cannot exceed 1000']
    },
    pagesPerDay: {
      type: Number,
      default: 20,
      min: [1, 'Pages per day must be at least 1'],
      max: [500, 'Pages per day cannot exceed 500']
    },
    minutesPerDay: {
      type: Number,
      default: 30,
      min: [1, 'Minutes per day must be at least 1'],
      max: [1440, 'Minutes per day cannot exceed 1440']
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
      enum: ['light', 'dark', 'sepia', 'auto'],
      default: 'auto'
    },
    lineHeight: {
      type: Number,
      default: 1.5,
      min: [1, 'Line height must be at least 1'],
      max: [3, 'Line height cannot exceed 3']
    },
    readingSpeed: {
      type: String,
      enum: ['slow', 'medium', 'fast'],
      default: 'medium'
    }
  },
  // Notification Preferences
  notifications: {
    email: {
      promotions: { type: Boolean, default: true },
      readingReminders: { type: Boolean, default: true },
      communityUpdates: { type: Boolean, default: true },
      newReleases: { type: Boolean, default: true },
      bookRecommendations: { type: Boolean, default: true }
    },
    push: {
      readingReminders: { type: Boolean, default: true },
      communityActivity: { type: Boolean, default: true },
      goalAchievements: { type: Boolean, default: true }
    },
    inApp: {
      friendRequests: { type: Boolean, default: true },
      communityInvites: { type: Boolean, default: true },
      readingUpdates: { type: Boolean, default: true }
    }
  },
  // Privacy Settings
  privacy: {
    profile: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    readingActivity: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    bookshelf: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    showReadingStats: {
      type: Boolean,
      default: true
    },
    showOnlineStatus: {
      type: Boolean,
      default: true
    }
  },
  // Language and Regional Settings
  language: {
    type: String,
    default: 'en',
    match: [/^[a-z]{2}$/, 'Language must be a 2-letter code']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  dateFormat: {
    type: String,
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    default: 'MM/DD/YYYY'
  }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const userStatisticsSchema = new mongoose.Schema({
  // Reading Statistics
  booksRead: {
    type: Number,
    default: 0,
    min: 0
  },
  pagesRead: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReadingTime: {
    type: Number, // in minutes
    default: 0,
    min: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    set: function(v) {
      return Math.round(v * 10) / 10; // Round to 1 decimal place
    }
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
  // Community Statistics
  communitiesJoined: {
    type: Number,
    default: 0,
    min: 0
  },
  discussionsStarted: {
    type: Number,
    default: 0,
    min: 0
  },
  commentsPosted: {
    type: Number,
    default: 0,
    min: 0
  },
  reviewsWritten: {
    type: Number,
    default: 0,
    min: 0
  },
  // Achievement Statistics
  achievementsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  badgesEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  // Activity Tracking
  lastReadingDate: Date,
  lastLoginDate: Date,
  consecutiveLoginDays: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLogins: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const userActivitySchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  interactionType: {
    type: String,
    enum: ['view', 'read', 'review', 'rating', 'added_to_shelf', 'shared'],
    required: true
  },
  shelfType: {
    type: String,
    enum: ['currentlyReading', 'wantToRead', 'finished'],
    required: function() {
      return this.interactionType === 'added_to_shelf';
    }
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
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
  progress: {
    type: Number,
    min: 0,
    max: 100
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    duration: Number, // Reading duration in minutes
    pagesRead: Number,
    device: String
  }
}, {
  _id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const searchHistorySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: [255, 'Search query cannot exceed 255 characters']
  },
  resultsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  filters: {
    genre: String,
    author: String,
    language: String
  }
}, {
  _id: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const userSchema = new mongoose.Schema({
  // Authentication Fields
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    index: true
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [255, 'Email cannot exceed 255 characters'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    index: true
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    maxlength: [128, 'Password cannot exceed 128 characters'],
    select: false // Don't include password in queries by default
  },

  // Profile Information
  profile: userProfileSchema,

  preferences: userPreferencesSchema,

  // Reading Data
  currentlyReading: [{
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    currentPage: {
      type: Number,
      default: 0,
      min: 0
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    readingTime: {
      type: Number, // in minutes
      default: 0,
      min: 0
    }
  }],

  wantToRead: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],

  finishedBooks: [{
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
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
    readingTime: {
      type: Number, // in minutes
      default: 0,
      min: 0
    },
    pagesRead: {
      type: Number,
      default: 0,
      min: 0
    }
  }],

  // Social and Community
  friends: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: Date
  }],

  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    message: {
      type: String,
      maxlength: [200, 'Friend request message cannot exceed 200 characters'],
      trim: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: Date
  }],

  joinedCommunities: [{
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Activity and History
  readingHistory: [userActivitySchema],

  searchHistory: [searchHistorySchema],

  viewedBooks: [{
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    viewCount: {
      type: Number,
      default: 1,
      min: 1
    }
  }],

  // Statistics
  stats: userStatisticsSchema,

  // Account Status and Verification
  isVerified: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isAdmin: {
    type: Boolean,
    default: false
  },

  verificationToken: String,

  resetPasswordToken: String,

  resetPasswordExpires: Date,

  emailVerificationToken: String,

  emailVerificationExpires: Date,

  // Timestamps
  lastLoginAt: {
    type: Date
  },

  passwordChangedAt: Date,

  // Soft Delete
  deletedAt: Date,

  // Metadata
  signUpSource: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web'
  },

  timezone: {
    type: String,
    default: 'UTC'
  }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ========== INDEXES ==========

// Text search index
userSchema.index({ 
  'username': 'text', 
  'email': 'text', 
  'profile.firstName': 'text', 
  'profile.lastName': 'text',
  'profile.bio': 'text'
});

// Compound indexes for common queries
userSchema.index({ 'isActive': 1, 'isVerified': 1 });
userSchema.index({ 'stats.booksRead': -1 });
userSchema.index({ 'stats.readingStreak': -1 });
userSchema.index({ 'joinedCommunities.community': 1 });
userSchema.index({ 'friends.user': 1 });
userSchema.index({ 'lastLoginAt': -1 });
userSchema.index({ 'createdAt': -1 });
userSchema.index({ 'preferences.favoriteGenres': 1 });

// ========== VIRTUAL PROPERTIES ==========

// Full name
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

// Display name (falls back to username)
userSchema.virtual('displayName').get(function() {
  return this.profile.firstName || this.username;
});

// Account age in days
userSchema.virtual('accountAgeInDays').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Is new user (less than 30 days)
userSchema.virtual('isNewUser').get(function() {
  return this.accountAgeInDays < 30;
});

// Reading level based on books read
userSchema.virtual('readingLevel').get(function() {
  const booksRead = this.stats.booksRead;
  if (booksRead >= 100) return 'Bookworm';
  if (booksRead >= 50) return 'Avid Reader';
  if (booksRead >= 25) return 'Regular Reader';
  if (booksRead >= 10) return 'Casual Reader';
  if (booksRead >= 1) return 'Beginner Reader';
  return 'New Reader';
});

// Average pages per book
userSchema.virtual('averagePagesPerBook').get(function() {
  if (this.stats.booksRead > 0) {
    return Math.round(this.stats.pagesRead / this.stats.booksRead);
  }
  return 0;
});

// Reading speed (pages per hour)
userSchema.virtual('readingSpeed').get(function() {
  if (this.stats.totalReadingTime > 0 && this.stats.pagesRead > 0) {
    const hours = this.stats.totalReadingTime / 60; // Convert minutes to hours
    return Math.round(this.stats.pagesRead / hours);
  }
  return 0;
});

// Friends count
userSchema.virtual('friendsCount').get(function() {
  return this.friends.filter(friend => friend.status === 'accepted').length;
});

// Pending friend requests count
userSchema.virtual('pendingFriendRequestsCount').get(function() {
  return this.friendRequests.filter(request => request.status === 'pending').length;
});

// Communities count
userSchema.virtual('communitiesCount').get(function() {
  return this.joinedCommunities.length;
});

// Currently reading count
userSchema.virtual('currentlyReadingCount').get(function() {
  return this.currentlyReading.length;
});

// Want to read count
userSchema.virtual('wantToReadCount').get(function() {
  return this.wantToRead.length;
});

// Finished books count
userSchema.virtual('finishedBooksCount').get(function() {
  return this.finishedBooks.length;
});

// Total books in collection
userSchema.virtual('totalBooksCount').get(function() {
  return this.currentlyReadingCount + this.wantToReadCount + this.finishedBooksCount;
});

// Reading goals progress
userSchema.virtual('readingGoalsProgress').get(function() {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  
  const yearlyBooksRead = this.finishedBooks.filter(book => 
    book.completedAt >= yearStart
  ).length;
  
  const booksProgress = this.preferences.readingGoals.booksPerYear > 0 
    ? (yearlyBooksRead / this.preferences.readingGoals.booksPerYear) * 100 
    : 0;
  
  return {
    books: {
      completed: yearlyBooksRead,
      goal: this.preferences.readingGoals.booksPerYear,
      progress: Math.min(100, Math.round(booksProgress))
    },
    pages: {
      goal: this.preferences.readingGoals.pagesPerDay * 365,
      progress: 0 // Would need additional tracking
    }
  };
});

// Is online (active in last 15 minutes)
userSchema.virtual('isOnline').get(function() {
  if (!this.lastLoginAt) return false;
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return this.lastLoginAt >= fifteenMinutesAgo;
});

// ========== PRE-SAVE MIDDLEWARE ==========

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Update passwordChangedAt when password is modified
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is created after
  next();
});

// Update statistics before saving
userSchema.pre('save', function(next) {
  // Update books read count
  this.stats.booksRead = this.finishedBooks.length;
  
  // Update pages read count
  this.stats.pagesRead = this.finishedBooks.reduce((total, book) => 
    total + (book.pagesRead || 0), 0
  );
  
  // Update reading time
  this.stats.totalReadingTime = this.finishedBooks.reduce((total, book) => 
    total + (book.readingTime || 0), 0
  );
  
  // Update average rating
  const ratedBooks = this.finishedBooks.filter(book => book.rating);
  if (ratedBooks.length > 0) {
    const totalRating = ratedBooks.reduce((sum, book) => sum + book.rating, 0);
    this.stats.averageRating = parseFloat((totalRating / ratedBooks.length).toFixed(1));
  }
  
  // Update communities joined count
  this.stats.communitiesJoined = this.joinedCommunities.length;
  
  next();
});

// ========== INSTANCE METHODS ==========

/**
 * Compare password with hashed password
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if password was changed after JWT was issued
 */
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  
  // False means NOT changed
  return false;
};

/**
 * Generate password reset token
 */
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

/**
 * Generate email verification token
 */
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

/**
 * Add book to currently reading
 */
userSchema.methods.addToCurrentlyReading = function(bookId, startPage = 0) {
  // Check if already in currently reading
  const existing = this.currentlyReading.find(item => 
    item.book.toString() === bookId.toString()
  );
  
  if (existing) {
    return this; // Already exists
  }
  
  // Remove from other shelves
  this.removeFromWantToRead(bookId);
  
  this.currentlyReading.push({
    book: bookId,
    startedAt: new Date(),
    lastReadAt: new Date(),
    currentPage: startPage,
    progress: 0
  });
  
  return this.save();
};

/**
 * Add book to want to read
 */
userSchema.methods.addToWantToRead = function(bookId) {
  // Check if already in want to read
  if (this.wantToRead.includes(bookId)) {
    return this; // Already exists
  }
  
  this.wantToRead.push(bookId);
  return this.save();
};

/**
 * Mark book as finished
 */
userSchema.methods.markAsFinished = function(bookId, rating = null, review = '', readingTime = 0, pagesRead = 0) {
  // Remove from currently reading and want to read
  this.removeFromCurrentlyReading(bookId);
  this.removeFromWantToRead(bookId);
  
  const finishedBook = {
    book: bookId,
    completedAt: new Date(),
    readingTime,
    pagesRead
  };
  
  if (rating) {
    finishedBook.rating = rating;
  }
  
  if (review) {
    finishedBook.review = review;
  }
  
  this.finishedBooks.push(finishedBook);
  
  // Update reading streak
  this.updateReadingStreak();
  
  return this.save();
};

/**
 * Remove book from currently reading
 */
userSchema.methods.removeFromCurrentlyReading = function(bookId) {
  this.currentlyReading = this.currentlyReading.filter(item => 
    item.book.toString() !== bookId.toString()
  );
  return this.save();
};

/**
 * Remove book from want to read
 */
userSchema.methods.removeFromWantToRead = function(bookId) {
  this.wantToRead = this.wantToRead.filter(id => 
    id.toString() !== bookId.toString()
  );
  return this.save();
};

/**
 * Remove book from finished
 */
userSchema.methods.removeFromFinished = function(bookId) {
  this.finishedBooks = this.finishedBooks.filter(item => 
    item.book.toString() !== bookId.toString()
  );
  return this.save();
};

/**
 * Update reading progress for a book
 */
userSchema.methods.updateReadingProgress = function(bookId, currentPage, totalPages, readingTime = 0) {
  const bookItem = this.currentlyReading.find(item => 
    item.book.toString() === bookId.toString()
  );
  
  if (!bookItem) {
    throw new Error('Book not found in currently reading');
  }
  
  bookItem.currentPage = currentPage;
  bookItem.progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  bookItem.lastReadAt = new Date();
  bookItem.readingTime += readingTime;
  
  // Update reading streak
  this.updateReadingStreak();
  
  return this.save();
};

/**
 * Update reading streak
 */
userSchema.methods.updateReadingStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastReadingDate = this.stats.lastReadingDate 
    ? new Date(this.stats.lastReadingDate)
    : null;
  
  let newStreak = this.stats.currentStreak || 0;
  
  if (!lastReadingDate) {
    // First time reading
    newStreak = 1;
  } else {
    lastReadingDate.setHours(0, 0, 0, 0);
    
    if (lastReadingDate.getTime() === yesterday.getTime()) {
      // Consecutive day
      newStreak += 1;
    } else if (lastReadingDate.getTime() === today.getTime()) {
      // Already read today
      // Keep current streak
    } else {
      // Streak broken
      newStreak = 1;
    }
  }
  
  this.stats.lastReadingDate = today;
  this.stats.currentStreak = newStreak;
  this.stats.longestStreak = Math.max(this.stats.longestStreak, newStreak);
  
  return this.save();
};

/**
 * Add to search history
 */
userSchema.methods.addToSearchHistory = function(query, resultsCount = 0, filters = {}) {
  const searchEntry = {
    query: query.trim(),
    resultsCount,
    timestamp: new Date(),
    filters
  };
  
  // Remove existing entry with same query
  this.searchHistory = this.searchHistory.filter(entry => 
    entry.query !== query
  );
  
  // Add to beginning of array
  this.searchHistory.unshift(searchEntry);
  
  // Keep only last 50 searches
  if (this.searchHistory.length > 50) {
    this.searchHistory = this.searchHistory.slice(0, 50);
  }
  
  return this.save();
};

/**
 * Add to viewed books
 */
userSchema.methods.addToViewedBooks = function(bookId) {
  const existingView = this.viewedBooks.find(view => 
    view.book.toString() === bookId.toString()
  );
  
  if (existingView) {
    existingView.viewCount += 1;
    existingView.timestamp = new Date();
  } else {
    this.viewedBooks.push({
      book: bookId,
      timestamp: new Date(),
      viewCount: 1
    });
  }
  
  // Keep only last 100 viewed books
  if (this.viewedBooks.length > 100) {
    this.viewedBooks = this.viewedBooks.slice(0, 100);
  }
  
  return this.save();
};

/**
 * Add friend request
 */
userSchema.methods.addFriendRequest = function(fromUserId, message = '') {
  // Check if request already exists
  const existingRequest = this.friendRequests.find(request => 
    request.from.toString() === fromUserId.toString() && 
    request.status === 'pending'
  );
  
  if (existingRequest) {
    return this; // Request already exists
  }
  
  this.friendRequests.push({
    from: fromUserId,
    message: message.trim(),
    status: 'pending',
    sentAt: new Date()
  });
  
  return this.save();
};

/**
 * Accept friend request
 */
userSchema.methods.acceptFriendRequest = function(fromUserId) {
  const request = this.friendRequests.find(req => 
    req.from.toString() === fromUserId.toString() && 
    req.status === 'pending'
  );
  
  if (!request) {
    throw new Error('Friend request not found');
  }
  
  request.status = 'accepted';
  request.respondedAt = new Date();
  
  // Add to friends list
  this.friends.push({
    user: fromUserId,
    status: 'accepted',
    createdAt: new Date(),
    acceptedAt: new Date()
  });
  
  return this.save();
};

/**
 * Join community
 */
userSchema.methods.joinCommunity = function(communityId, role = 'member') {
  // Check if already joined
  const existingJoin = this.joinedCommunities.find(join => 
    join.community.toString() === communityId.toString()
  );
  
  if (existingJoin) {
    return this; // Already joined
  }
  
  this.joinedCommunities.push({
    community: communityId,
    role,
    joinedAt: new Date(),
    lastActiveAt: new Date()
  });
  
  return this.save();
};

/**
 * Check if user has read a book
 */
userSchema.methods.hasReadBook = function(bookId) {
  return this.finishedBooks.some(item => 
    item.book.toString() === bookId.toString()
  );
};

/**
 * Check if user is currently reading a book
 */
userSchema.methods.isCurrentlyReading = function(bookId) {
  return this.currentlyReading.some(item => 
    item.book.toString() === bookId.toString()
  );
};

/**
 * Check if user wants to read a book
 */
userSchema.methods.wantsToRead = function(bookId) {
  return this.wantToRead.some(id => 
    id.toString() === bookId.toString()
  );
};

// ========== STATIC METHODS ==========

/**
 * Find user by email or username
 */
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() }
    ]
  });
};

/**
 * Find users by reading statistics
 */
userSchema.statics.findByReadingStats = function(minBooks = 0, minPages = 0, limit = 10) {
  return this.find({
    'stats.booksRead': { $gte: minBooks },
    'stats.pagesRead': { $gte: minPages },
    'isActive': true
  })
  .select('username profile avatar stats')
  .sort({ 'stats.booksRead': -1, 'stats.pagesRead': -1 })
  .limit(limit);
};

/**
 * Find top readers
 */
userSchema.statics.findTopReaders = function(limit = 10) {
  return this.find({ 'isActive': true })
    .select('username profile avatar stats')
    .sort({ 'stats.booksRead': -1, 'stats.pagesRead': -1 })
    .limit(limit);
};

/**
 * Find users by genre preference
 */
userSchema.statics.findByGenre = function(genre, limit = 20) {
  return this.find({
    'preferences.favoriteGenres': { $in: [new RegExp(genre, 'i')] },
    'isActive': true
  })
  .select('username profile avatar stats preferences')
  .limit(limit);
};

/**
 * Search users by name or username
 */
userSchema.statics.search = function(query, limit = 20, page = 1) {
  return this.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { 'profile.firstName': { $regex: query, $options: 'i' } },
      { 'profile.lastName': { $regex: query, $options: 'i' } }
    ],
    'isActive': true
  })
  .select('username profile avatar stats')
  .limit(limit)
  .skip((page - 1) * limit)
  .sort({ 'stats.booksRead': -1, username: 1 });
};

/**
 * Get user statistics for dashboard
 */
userSchema.statics.getDashboardStats = function() {
  return this.aggregate([
    {
      $match: {
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalBooksRead: { $sum: '$stats.booksRead' },
        totalPagesRead: { $sum: '$stats.pagesRead' },
        averageBooksPerUser: { $avg: '$stats.booksRead' },
        averageRating: { $avg: '$stats.averageRating' },
        activeToday: {
          $sum: {
            $cond: [
              { $gte: ['$lastLoginAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

/**
 * Find users with similar reading tastes
 */
userSchema.statics.findSimilarUsers = function(userId, limit = 10) {
  return this.findById(userId)
    .then(user => {
      if (!user) return [];
      
      return this.find({
        _id: { $ne: userId },
        'preferences.favoriteGenres': { $in: user.preferences.favoriteGenres },
        'isActive': true
      })
      .select('username profile avatar stats preferences')
      .limit(limit)
      .sort({ 'stats.booksRead': -1 });
    });
};

/**
 * Get user growth statistics
 */
userSchema.statics.getUserGrowth = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        newUsers: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

export default mongoose.model('User', userSchema);