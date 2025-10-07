import User from '../models/User.js';
import Book from '../models/Book.js';
import ReadingSession from '../models/ReadingSession.js';
import Community from '../models/Community.js';
import { validationResult } from 'express-validator';

/**
 * User Controller
 * Handles user profile management, bookshelves, reading goals, and user statistics
 */

/**
 * @desc    Get user profile by ID or username
 * @route   GET /api/users/:identifier
 * @access  Public
 */
export const getUserProfile = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Determine if identifier is ID or username
    let user;
    if (identifier.length === 24) { // MongoDB ObjectId length
      user = await User.findById(identifier)
        .select('-password -email -isAdmin -verificationToken -resetPasswordToken -resetPasswordExpires')
        .populate('currentlyReading.book', 'title author coverImage pageCount genres')
        .populate('wantToRead', 'title author coverImage genres averageRating')
        .populate('finishedBooks.book', 'title author coverImage pageCount genres')
        .populate('joinedCommunities.community', 'name description genre membersCount');
    } else {
      user = await User.findOne({ username: identifier.toLowerCase() })
        .select('-password -email -isAdmin -verificationToken -resetPasswordToken -resetPasswordExpires')
        .populate('currentlyReading.book', 'title author coverImage pageCount genres')
        .populate('wantToRead', 'title author coverImage genres averageRating')
        .populate('finishedBooks.book', 'title author coverImage pageCount genres')
        .populate('joinedCommunities.community', 'name description genre membersCount');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate reading statistics
    const readingStats = await calculateUserReadingStats(user._id);

    // Get recent activity
    const recentActivity = await getRecentUserActivity(user._id);

    // Check if the requesting user is viewing their own profile
    const isOwnProfile = req.user && req.user.id === user._id.toString();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          profile: user.profile,
          preferences: user.preferences,
          stats: {
            ...user.stats,
            ...readingStats
          },
          currentlyReading: user.currentlyReading || [],
          wantToRead: user.wantToRead || [],
          finishedBooks: user.finishedBooks || [],
          joinedCommunities: user.joinedCommunities || [],
          isOwnProfile,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        recentActivity
      }
    });

  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      bio,
      avatar,
      favoriteGenres,
      favoriteAuthors,
      readingGoals,
      notifications
    } = req.body;

    const userId = req.user.id;

    // Build update object
    const updateFields = {};
    
    if (firstName !== undefined) updateFields['profile.firstName'] = firstName?.trim();
    if (lastName !== undefined) updateFields['profile.lastName'] = lastName?.trim();
    if (bio !== undefined) updateFields['profile.bio'] = bio?.trim();
    if (avatar !== undefined) updateFields['profile.avatar'] = avatar;
    
    if (favoriteGenres !== undefined) {
      updateFields['preferences.favoriteGenres'] = favoriteGenres.slice(0, 10);
    }
    
    if (favoriteAuthors !== undefined) {
      updateFields['preferences.favoriteAuthors'] = favoriteAuthors.slice(0, 10);
    }
    
    if (readingGoals !== undefined) {
      if (readingGoals.booksPerYear !== undefined) {
        updateFields['preferences.readingGoals.booksPerYear'] = Math.max(1, Math.min(1000, readingGoals.booksPerYear));
      }
      if (readingGoals.pagesPerDay !== undefined) {
        updateFields['preferences.readingGoals.pagesPerDay'] = Math.max(1, Math.min(500, readingGoals.pagesPerDay));
      }
    }

    if (notifications !== undefined) {
      if (notifications.email !== undefined) updateFields['preferences.notifications.email'] = notifications.email;
      if (notifications.recommendations !== undefined) updateFields['preferences.notifications.recommendations'] = notifications.recommendations;
      if (notifications.newReleases !== undefined) updateFields['preferences.notifications.newReleases'] = notifications.newReleases;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { 
        new: true,
        runValidators: true
      }
    ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`📝 Profile updated for: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('❌ Update user profile error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Add book to user's bookshelf
 * @route   POST /api/users/bookshelf
 * @access  Private
 */
export const addToBookshelf = async (req, res) => {
  try {
    const { bookId, shelfType } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required'
      });
    }

    if (!['currentlyReading', 'wantToRead', 'finished'].includes(shelfType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shelf type. Must be: currentlyReading, wantToRead, or finished'
      });
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const user = await User.findById(userId);

    // Remove book from other shelves first
    await User.findByIdAndUpdate(userId, {
      $pull: {
        currentlyReading: { book: bookId },
        wantToRead: bookId,
        finishedBooks: { book: bookId }
      }
    });

    let updateOperation = {};
    let message = '';

    switch (shelfType) {
      case 'currentlyReading':
        updateOperation = {
          $addToSet: {
            currentlyReading: {
              book: bookId,
              startedAt: new Date(),
              lastReadAt: new Date(),
              currentPage: 0,
              progress: 0
            }
          }
        };
        message = 'Book added to Currently Reading';
        break;

      case 'wantToRead':
        updateOperation = {
          $addToSet: {
            wantToRead: bookId
          }
        };
        message = 'Book added to Want to Read';
        break;

      case 'finished':
        updateOperation = {
          $addToSet: {
            finishedBooks: {
              book: bookId,
              completedAt: new Date(),
              rating: 0
            }
          },
          $inc: {
            'stats.booksRead': 1,
            'stats.pagesRead': book.pageCount || 0
          }
        };
        message = 'Book added to Finished Books';
        break;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateOperation,
      { new: true }
    )
    .populate('currentlyReading.book', 'title author coverImage pageCount')
    .populate('wantToRead', 'title author coverImage')
    .populate('finishedBooks.book', 'title author coverImage pageCount');

    // Create reading session if added to currentlyReading
    if (shelfType === 'currentlyReading') {
      const existingSession = await ReadingSession.findOne({
        user: userId,
        book: bookId,
        status: 'active'
      });

      if (!existingSession) {
        await ReadingSession.create({
          user: userId,
          book: bookId,
          startPage: 0,
          currentPage: 0,
          status: 'active',
          startTime: new Date()
        });
      }
    }

    console.log(`📚 Book added to ${shelfType}: ${user.username} -> ${book.title}`);

    res.status(200).json({
      success: true,
      message,
      data: {
        shelfType,
        book: {
          id: book._id,
          title: book.title,
          author: book.primaryAuthor,
          coverImage: book.coverImage
        },
        bookshelf: {
          currentlyReading: updatedUser.currentlyReading,
          wantToRead: updatedUser.wantToRead,
          finishedBooks: updatedUser.finishedBooks
        }
      }
    });

  } catch (error) {
    console.error('❌ Add to bookshelf error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding book to bookshelf',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Remove book from user's bookshelf
 * @route   DELETE /api/users/bookshelf
 * @access  Private
 */
export const removeFromBookshelf = async (req, res) => {
  try {
    const { bookId, shelfType } = req.body;
    const userId = req.user.id;

    if (!bookId || !shelfType) {
      return res.status(400).json({
        success: false,
        message: 'Book ID and shelf type are required'
      });
    }

    if (!['currentlyReading', 'wantToRead', 'finished'].includes(shelfType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shelf type'
      });
    }

    let updateOperation = {};
    let message = '';

    switch (shelfType) {
      case 'currentlyReading':
        updateOperation = {
          $pull: { currentlyReading: { book: bookId } }
        };
        message = 'Book removed from Currently Reading';
        break;

      case 'wantToRead':
        updateOperation = {
          $pull: { wantToRead: bookId }
        };
        message = 'Book removed from Want to Read';
        break;

      case 'finished':
        updateOperation = {
          $pull: { finishedBooks: { book: bookId } },
          $inc: {
            'stats.booksRead': -1,
            'stats.pagesRead': -(await Book.findById(bookId).select('pageCount'))?.pageCount || 0
          }
        };
        message = 'Book removed from Finished Books';
        break;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateOperation,
      { new: true }
    )
    .populate('currentlyReading.book', 'title author coverImage pageCount')
    .populate('wantToRead', 'title author coverImage')
    .populate('finishedBooks.book', 'title author coverImage pageCount');

    // If removing from currentlyReading, also pause any active reading sessions
    if (shelfType === 'currentlyReading') {
      await ReadingSession.findOneAndUpdate(
        {
          user: userId,
          book: bookId,
          status: 'active'
        },
        {
          status: 'paused',
          pausedAt: new Date()
        }
      );
    }

    console.log(`🗑️ Book removed from ${shelfType}: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message,
      data: {
        bookshelf: {
          currentlyReading: updatedUser.currentlyReading,
          wantToRead: updatedUser.wantToRead,
          finishedBooks: updatedUser.finishedBooks
        }
      }
    });

  } catch (error) {
    console.error('❌ Remove from bookshelf error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing book from bookshelf',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user's bookshelf
 * @route   GET /api/users/bookshelf/:shelfType?
 * @access  Private
 */
export const getBookshelf = async (req, res) => {
  try {
    const { shelfType } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    let user;
    let books = [];
    let total = 0;

    if (shelfType && !['currentlyReading', 'wantToRead', 'finished'].includes(shelfType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shelf type'
      });
    }

    if (shelfType) {
      // Get specific shelf
      switch (shelfType) {
        case 'currentlyReading':
          user = await User.findById(userId)
            .populate({
              path: 'currentlyReading.book',
              select: 'title author coverImage pageCount genres description averageRating'
            })
            .select('currentlyReading');
          books = user?.currentlyReading || [];
          break;

        case 'wantToRead':
          user = await User.findById(userId)
            .populate('wantToRead', 'title author coverImage pageCount genres description averageRating')
            .select('wantToRead');
          books = user?.wantToRead || [];
          break;

        case 'finished':
          user = await User.findById(userId)
            .populate({
              path: 'finishedBooks.book',
              select: 'title author coverImage pageCount genres description averageRating'
            })
            .select('finishedBooks');
          books = user?.finishedBooks || [];
          break;
      }

      total = books.length;
      
      // Paginate results
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      books = books.slice(startIndex, endIndex);

    } else {
      // Get all shelves
      user = await User.findById(userId)
        .populate({
          path: 'currentlyReading.book',
          select: 'title author coverImage pageCount genres'
        })
        .populate('wantToRead', 'title author coverImage genres')
        .populate({
          path: 'finishedBooks.book',
          select: 'title author coverImage pageCount genres'
        })
        .select('currentlyReading wantToRead finishedBooks');

      books = {
        currentlyReading: user?.currentlyReading || [],
        wantToRead: user?.wantToRead || [],
        finishedBooks: user?.finishedBooks || []
      };
    }

    res.status(200).json({
      success: true,
      data: {
        shelfType: shelfType || 'all',
        books,
        ...(shelfType && {
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            hasNext: (parseInt(page) * parseInt(limit)) < total,
            hasPrev: parseInt(page) > 1
          }
        })
      }
    });

  } catch (error) {
    console.error('❌ Get bookshelf error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookshelf',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update reading progress for a book
 * @route   PUT /api/users/reading-progress
 * @access  Private
 */
export const updateReadingProgress = async (req, res) => {
  try {
    const { bookId, currentPage, progress } = req.body;
    const userId = req.user.id;

    if (!bookId || (currentPage === undefined && progress === undefined)) {
      return res.status(400).json({
        success: false,
        message: 'Book ID and either currentPage or progress are required'
      });
    }

    // Get book to validate and get total pages
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Calculate current page and progress
    let newCurrentPage = currentPage;
    let newProgress = progress;

    if (currentPage !== undefined) {
      newCurrentPage = Math.max(0, Math.min(book.pageCount, parseInt(currentPage)));
      newProgress = book.pageCount > 0 ? Math.round((newCurrentPage / book.pageCount) * 100) : 0;
    } else if (progress !== undefined) {
      newProgress = Math.max(0, Math.min(100, parseInt(progress)));
      newCurrentPage = book.pageCount > 0 ? Math.round((newProgress / 100) * book.pageCount) : 0;
    }

    // Update user's currently reading progress
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        'currentlyReading.book': bookId
      },
      {
        $set: {
          'currentlyReading.$.currentPage': newCurrentPage,
          'currentlyReading.$.progress': newProgress,
          'currentlyReading.$.lastReadAt': new Date()
        }
      },
      { new: true }
    ).populate('currentlyReading.book', 'title author coverImage pageCount');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Book not found in currently reading list'
      });
    }

    // Update reading session
    await ReadingSession.findOneAndUpdate(
      {
        user: userId,
        book: bookId,
        status: 'active'
      },
      {
        currentPage: newCurrentPage,
        progress: newProgress,
        lastReadAt: new Date(),
        $inc: {
          pagesRead: newCurrentPage - (await ReadingSession.findOne({
            user: userId,
            book: bookId
          }))?.currentPage || 0
        }
      },
      { upsert: true, new: true }
    );

    console.log(`📖 Reading progress updated: ${req.user.username} -> ${book.title} (${newProgress}%)`);

    res.status(200).json({
      success: true,
      message: 'Reading progress updated successfully',
      data: {
        book: {
          id: book._id,
          title: book.title,
          author: book.primaryAuthor
        },
        progress: {
          currentPage: newCurrentPage,
          totalPages: book.pageCount,
          percentage: newProgress,
          pagesRemaining: Math.max(0, book.pageCount - newCurrentPage)
        }
      }
    });

  } catch (error) {
    console.error('❌ Update reading progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reading progress',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user's reading statistics
 * @route   GET /api/users/statistics
 * @access  Private
 */
export const getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const statistics = await calculateUserReadingStats(userId);

    // Get reading goals progress
    const goalsProgress = await getReadingGoalsProgress(userId);

    // Get reading history (last 30 days)
    const readingHistory = await getReadingHistory(userId);

    // Get favorite genres and authors
    const favorites = await getUserFavorites(userId);

    res.status(200).json({
      success: true,
      data: {
        statistics,
        goalsProgress,
        readingHistory,
        favorites
      }
    });

  } catch (error) {
    console.error('❌ Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user's reading goals
 * @route   PUT /api/users/reading-goals
 * @access  Private
 */
export const updateReadingGoals = async (req, res) => {
  try {
    const { booksPerYear, pagesPerDay } = req.body;
    const userId = req.user.id;

    if (booksPerYear === undefined && pagesPerDay === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one goal (booksPerYear or pagesPerDay) is required'
      });
    }

    const updateFields = {};

    if (booksPerYear !== undefined) {
      updateFields['preferences.readingGoals.booksPerYear'] = Math.max(1, Math.min(1000, parseInt(booksPerYear)));
    }

    if (pagesPerDay !== undefined) {
      updateFields['preferences.readingGoals.pagesPerDay'] = Math.max(1, Math.min(500, parseInt(pagesPerDay)));
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('preferences.readingGoals');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`🎯 Reading goals updated for: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'Reading goals updated successfully',
      data: {
        readingGoals: user.preferences.readingGoals
      }
    });

  } catch (error) {
    console.error('❌ Update reading goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reading goals',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Search users by username or name
 * @route   GET /api/users/search
 * @access  Public
 */
export const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      $or: [
        { username: searchRegex },
        { 'profile.firstName': searchRegex },
        { 'profile.lastName': searchRegex }
      ]
    })
    .select('username profile avatar stats joinedCommunities')
    .limit(parseInt(limit) * 1)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ 'stats.booksRead': -1, username: 1 });

    const total = await User.countDocuments({
      $or: [
        { username: searchRegex },
        { 'profile.firstName': searchRegex },
        { 'profile.lastName': searchRegex }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: (parseInt(page) * parseInt(limit)) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmation } = req.body;

    if (!confirmation || confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation phrase is required to delete account'
      });
    }

    // Find user first to get username for logging
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's reading sessions
    await ReadingSession.deleteMany({ user: userId });

    // Remove user from communities
    await Community.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // Delete user account
    await User.findByIdAndDelete(userId);

    console.log(`🗑️ User account deleted: ${user.username} (${user.email})`);

    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to calculate user reading statistics
async function calculateUserReadingStats(userId) {
  const stats = await ReadingSession.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalBooksRead: { $sum: 1 },
        totalPagesRead: { $sum: '$pagesRead' },
        totalReadingTime: { $sum: '$totalReadingTime' },
        averageRating: { $avg: '$finalRating' }
      }
    }
  ]);

  const currentSessions = await ReadingSession.countDocuments({
    user: userId,
    status: { $in: ['active', 'paused'] }
  });

  const user = await User.findById(userId).select('stats');

  return {
    totalBooksRead: stats[0]?.totalBooksRead || 0,
    totalPagesRead: stats[0]?.totalPagesRead || 0,
    totalReadingTime: stats[0]?.totalReadingTime || 0,
    averageRating: Math.round((stats[0]?.averageRating || 0) * 10) / 10,
    currentSessions,
    readingStreak: user?.stats?.readingStreak || 0,
    communitiesJoined: user?.joinedCommunities?.length || 0
  };
}

// Helper function to get reading goals progress
async function getReadingGoalsProgress(userId) {
  const user = await User.findById(userId).select('preferences.readingGoals');
  const goals = user?.preferences?.readingGoals || {};
  
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  
  const yearlyProgress = await ReadingSession.aggregate([
    {
      $match: {
        user: userId,
        status: 'completed',
        endTime: { $gte: yearStart }
      }
    },
    {
      $group: {
        _id: null,
        booksRead: { $sum: 1 },
        pagesRead: { $sum: '$pagesRead' }
      }
    }
  ]);

  const booksRead = yearlyProgress[0]?.booksRead || 0;
  const pagesRead = yearlyProgress[0]?.pagesRead || 0;

  return {
    yearly: {
      books: {
        target: goals.booksPerYear || 12,
        completed: booksRead,
        progress: Math.round((booksRead / (goals.booksPerYear || 12)) * 100),
        remaining: Math.max(0, (goals.booksPerYear || 12) - booksRead)
      },
      pages: {
        target: (goals.pagesPerDay || 20) * 365,
        completed: pagesRead,
        progress: Math.round((pagesRead / ((goals.pagesPerDay || 20) * 365)) * 100),
        remaining: Math.max(0, ((goals.pagesPerDay || 20) * 365) - pagesRead)
      }
    }
  };
}

// Helper function to get reading history
async function getReadingHistory(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return await ReadingSession.aggregate([
    {
      $match: {
        user: userId,
        lastReadAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$lastReadAt' },
          month: { $month: '$lastReadAt' },
          day: { $dayOfMonth: '$lastReadAt' }
        },
        totalReadingTime: { $sum: '$totalReadingTime' },
        pagesRead: { $sum: '$pagesRead' },
        sessionCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    },
    {
      $limit: 30
    }
  ]);
}

// Helper function to get user favorites
async function getUserFavorites(userId) {
  const genreStats = await ReadingSession.aggregate([
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
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  const authorStats = await ReadingSession.aggregate([
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
      $unwind: '$bookData.authors'
    },
    {
      $group: {
        _id: '$bookData.authors',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  return {
    genres: genreStats.map(genre => ({
      genre: genre._id,
      bookCount: genre.count
    })),
    authors: authorStats.map(author => ({
      author: author._id,
      bookCount: author.count
    }))
  };
}

// Helper function to get recent user activity
async function getRecentUserActivity(userId) {
  const recentSessions = await ReadingSession.find({
    user: userId,
    status: { $in: ['active', 'completed'] }
  })
  .populate('book', 'title author coverImage')
  .sort({ lastReadAt: -1 })
  .limit(10);

  return recentSessions.map(session => ({
    type: session.status === 'completed' ? 'book_finished' : 'reading_progress',
    book: session.book,
    progress: session.progress,
    timestamp: session.lastReadAt,
    duration: session.totalReadingTime
  }));
}

export default {
  getUserProfile,
  updateUserProfile,
  addToBookshelf,
  removeFromBookshelf,
  getBookshelf,
  updateReadingProgress,
  getUserStatistics,
  updateReadingGoals,
  searchUsers,
  deleteAccount
};