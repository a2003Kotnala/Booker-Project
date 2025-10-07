import ReadingSession from '../models/ReadingSession.js';
import Book from '../models/Book.js';
import User from '../models/User.js';

/**
 * Reading Controller
 * Handles reading sessions, progress tracking, and reading statistics
 */

/**
 * @desc    Start a new reading session
 * @route   POST /api/reading/sessions/start
 * @access  Private
 */
export const startReadingSession = async (req, res) => {
  try {
    const { bookId, startPage = 0 } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required'
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

    // Check if there's an active session for this book
    const existingSession = await ReadingSession.findOne({
      user: userId,
      book: bookId,
      status: 'active'
    });

    if (existingSession) {
      return res.status(200).json({
        success: true,
        message: 'Resumed existing reading session',
        data: {
          session: existingSession,
          book: {
            id: book._id,
            title: book.title,
            author: book.primaryAuthor,
            coverImage: book.coverImage,
            pages: book.pageCount
          }
        }
      });
    }

    // Check if user has already completed this book
    const completedSession = await ReadingSession.findOne({
      user: userId,
      book: bookId,
      status: 'completed'
    });

    if (completedSession) {
      return res.status(400).json({
        success: false,
        message: 'You have already completed this book'
      });
    }

    // Create new reading session
    const readingSession = new ReadingSession({
      user: userId,
      book: bookId,
      startPage: Math.max(0, parseInt(startPage)),
      currentPage: Math.max(0, parseInt(startPage)),
      status: 'active',
      startTime: new Date()
    });

    await readingSession.save();

    // Update user's currently reading list
    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        currentlyReading: {
          book: bookId,
          startedAt: new Date(),
          lastReadAt: new Date()
        }
      }
    });

    // Populate session with book details
    await readingSession.populate('book', 'title author coverImage pageCount genres');

    console.log(`📖 Reading session started: ${req.user.username} -> ${book.title}`);

    res.status(201).json({
      success: true,
      message: 'Reading session started successfully',
      data: {
        session: readingSession,
        book: {
          id: book._id,
          title: book.title,
          author: book.primaryAuthor,
          coverImage: book.coverImage,
          pages: book.pageCount,
          genres: book.genres
        }
      }
    });

  } catch (error) {
    console.error('❌ Start reading session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting reading session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update reading progress
 * @route   PUT /api/reading/sessions/update
 * @access  Private
 */
export const updateReadingProgress = async (req, res) => {
  try {
    const { sessionId, currentPage, pagesRead, readingTime, note } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    if (currentPage === undefined && pagesRead === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Either currentPage or pagesRead is required'
      });
    }

    // Find the reading session
    const readingSession = await ReadingSession.findOne({
      _id: sessionId,
      user: userId,
      status: 'active'
    }).populate('book', 'title pageCount coverImage');

    if (!readingSession) {
      return res.status(404).json({
        success: false,
        message: 'Active reading session not found'
      });
    }

    // Calculate new current page
    let newCurrentPage = readingSession.currentPage;
    
    if (currentPage !== undefined) {
      newCurrentPage = Math.max(0, Math.min(readingSession.book.pageCount, parseInt(currentPage)));
    } else if (pagesRead !== undefined) {
      newCurrentPage = Math.max(0, Math.min(readingSession.book.pageCount, readingSession.currentPage + parseInt(pagesRead)));
    }

    // Calculate progress percentage
    const progress = readingSession.book.pageCount > 0 
      ? Math.round((newCurrentPage / readingSession.book.pageCount) * 100)
      : 0;

    // Update session
    const updateData = {
      currentPage: newCurrentPage,
      progress,
      lastReadAt: new Date(),
      $inc: {}
    };

    // Add reading time if provided
    if (readingTime && readingTime > 0) {
      updateData.$inc.totalReadingTime = Math.max(0, parseInt(readingTime));
    }

    // Add pages read if provided separately
    if (pagesRead && pagesRead > 0) {
      updateData.$inc.pagesRead = Math.max(0, parseInt(pagesRead));
    } else {
      // Calculate pages read from current page change
      const pagesReadThisUpdate = Math.max(0, newCurrentPage - readingSession.currentPage);
      if (pagesReadThisUpdate > 0) {
        updateData.$inc.pagesRead = pagesReadThisUpdate;
      }
    }

    // Add note if provided
    if (note && note.trim()) {
      if (!readingSession.notes) {
        readingSession.notes = [];
      }
      readingSession.notes.push({
        page: newCurrentPage,
        content: note.trim(),
        createdAt: new Date()
      });
      await readingSession.save();
    }

    const updatedSession = await ReadingSession.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true, runValidators: true }
    ).populate('book', 'title pageCount coverImage author genres');

    // Update user's currently reading with latest progress
    await User.findByIdAndUpdate(userId, {
      $set: {
        'currentlyReading.$[elem].lastReadAt': new Date(),
        'currentlyReading.$[elem].currentPage': newCurrentPage,
        'currentlyReading.$[elem].progress': progress
      }
    }, {
      arrayFilters: [{ 'elem.book': readingSession.book._id }]
    });

    // Check if book is completed
    if (progress >= 95) { // 95% threshold for completion
      await completeReadingSession(sessionId, userId);
    }

    console.log(`📈 Reading progress updated: ${req.user.username} -> ${readingSession.book.title} (${progress}%)`);

    res.status(200).json({
      success: true,
      message: 'Reading progress updated successfully',
      data: {
        session: updatedSession,
        progress: {
          currentPage: newCurrentPage,
          totalPages: readingSession.book.pageCount,
          percentage: progress,
          pagesRemaining: Math.max(0, readingSession.book.pageCount - newCurrentPage)
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
 * @desc    Pause reading session
 * @route   PUT /api/reading/sessions/pause
 * @access  Private
 */
export const pauseReadingSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const readingSession = await ReadingSession.findOneAndUpdate(
      {
        _id: sessionId,
        user: userId,
        status: 'active'
      },
      {
        status: 'paused',
        pausedAt: new Date(),
        lastReadAt: new Date()
      },
      { new: true }
    ).populate('book', 'title coverImage');

    if (!readingSession) {
      return res.status(404).json({
        success: false,
        message: 'Active reading session not found'
      });
    }

    console.log(`⏸️ Reading session paused: ${req.user.username} -> ${readingSession.book.title}`);

    res.status(200).json({
      success: true,
      message: 'Reading session paused successfully',
      data: { session: readingSession }
    });

  } catch (error) {
    console.error('❌ Pause reading session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausing reading session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Resume reading session
 * @route   PUT /api/reading/sessions/resume
 * @access  Private
 */
export const resumeReadingSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const readingSession = await ReadingSession.findOneAndUpdate(
      {
        _id: sessionId,
        user: userId,
        status: 'paused'
      },
      {
        status: 'active',
        resumedAt: new Date(),
        lastReadAt: new Date()
      },
      { new: true }
    ).populate('book', 'title coverImage pageCount');

    if (!readingSession) {
      return res.status(404).json({
        success: false,
        message: 'Paused reading session not found'
      });
    }

    console.log(`▶️ Reading session resumed: ${req.user.username} -> ${readingSession.book.title}`);

    res.status(200).json({
      success: true,
      message: 'Reading session resumed successfully',
      data: { 
        session: readingSession,
        progress: {
          currentPage: readingSession.currentPage,
          totalPages: readingSession.book.pageCount,
          percentage: readingSession.progress,
          pagesRemaining: Math.max(0, readingSession.book.pageCount - readingSession.currentPage)
        }
      }
    });

  } catch (error) {
    console.error('❌ Resume reading session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resuming reading session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    End reading session and mark as completed
 * @route   POST /api/reading/sessions/complete
 * @access  Private
 */
export const completeReadingSession = async (req, res) => {
  try {
    const { sessionId, rating, review } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const readingSession = await ReadingSession.findOne({
      _id: sessionId,
      user: userId,
      status: { $in: ['active', 'paused'] }
    }).populate('book', 'title pageCount coverImage authors genres');

    if (!readingSession) {
      return res.status(404).json({
        success: false,
        message: 'Reading session not found or already completed'
      });
    }

    // Update session as completed
    readingSession.status = 'completed';
    readingSession.endTime = new Date();
    readingSession.progress = 100;
    readingSession.currentPage = readingSession.book.pageCount;

    // Add rating and review if provided
    if (rating && rating >= 1 && rating <= 5) {
      readingSession.finalRating = parseInt(rating);
    }

    if (review && review.trim()) {
      readingSession.finalReview = review.trim();
    }

    await readingSession.save();

    // Update user's reading history
    await User.findByIdAndUpdate(userId, {
      $pull: { currentlyReading: { book: readingSession.book._id } },
      $addToSet: { 
        finishedBooks: {
          book: readingSession.book._id,
          completedAt: new Date(),
          rating: readingSession.finalRating,
          review: readingSession.finalReview,
          readingTime: readingSession.totalReadingTime,
          pagesRead: readingSession.pagesRead || readingSession.book.pageCount
        }
      },
      $inc: {
        'stats.booksRead': 1,
        'stats.pagesRead': readingSession.pagesRead || readingSession.book.pageCount,
        'stats.totalReadingTime': readingSession.totalReadingTime || 0
      }
    });

    // Update reading streak
    await updateReadingStreak(userId);

    // Add to book reviews if rating provided
    if (rating) {
      const book = await Book.findById(readingSession.book._id);
      if (book && !book.reviews.some(r => r.user.toString() === userId)) {
        book.reviews.push({
          user: userId,
          rating: parseInt(rating),
          comment: review || `Finished reading on ${new Date().toLocaleDateString()}`,
          isVerifiedPurchase: true
        });
        book.updateAverageRating();
        await book.save();
      }
    }

    console.log(`🎉 Book completed: ${req.user.username} -> ${readingSession.book.title}`);

    res.status(200).json({
      success: true,
      message: 'Book completed successfully!',
      data: {
        session: readingSession,
        book: {
          id: readingSession.book._id,
          title: readingSession.book.title,
          author: readingSession.book.authors?.[0],
          coverImage: readingSession.book.coverImage
        },
        statistics: {
          totalReadingTime: readingSession.totalReadingTime,
          pagesRead: readingSession.pagesRead || readingSession.book.pageCount,
          sessionsCount: readingSession.sessionCount || 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Complete reading session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing reading session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get current reading sessions
 * @route   GET /api/reading/sessions/current
 * @access  Private
 */
export const getCurrentSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const sessions = await ReadingSession.find({
      user: userId,
      status: { $in: ['active', 'paused'] }
    })
    .populate('book', 'title author coverImage pageCount genres')
    .sort({ lastReadAt: -1 })
    .limit(parseInt(limit));

    // Transform response
    const transformedSessions = sessions.map(session => ({
      id: session._id,
      book: session.book,
      progress: {
        currentPage: session.currentPage,
        totalPages: session.book.pageCount,
        percentage: session.progress,
        pagesRemaining: Math.max(0, session.book.pageCount - session.currentPage)
      },
      status: session.status,
      lastReadAt: session.lastReadAt,
      totalReadingTime: session.totalReadingTime,
      startedAt: session.startTime
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions: transformedSessions,
        count: transformedSessions.length
      }
    });

  } catch (error) {
    console.error('❌ Get current sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current reading sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get reading history
 * @route   GET /api/reading/history
 * @access  Private
 */
export const getReadingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status,
      sortBy = 'lastReadAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const sessions = await ReadingSession.find(filter)
      .populate('book', 'title author coverImage pageCount genres averageRating')
      .sort(sort)
      .limit(parseInt(limit) * 1)
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ReadingSession.countDocuments(filter);

    // Calculate reading statistics
    const stats = await calculateReadingStatistics(userId);

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: (parseInt(page) * parseInt(limit)) < total,
          hasPrev: parseInt(page) > 1
        },
        statistics: stats
      }
    });

  } catch (error) {
    console.error('❌ Get reading history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reading history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get reading statistics
 * @route   GET /api/reading/statistics
 * @access  Private
 */
export const getReadingStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const statistics = await calculateReadingStatistics(userId);

    // Get recent reading activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await ReadingSession.aggregate([
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

    res.status(200).json({
      success: true,
      data: {
        statistics,
        recentActivity,
        readingGoals: await getReadingGoals(userId)
      }
    });

  } catch (error) {
    console.error('❌ Get reading statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reading statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Add reading note
 * @route   POST /api/reading/notes
 * @access  Private
 */
export const addReadingNote = async (req, res) => {
  try {
    const { sessionId, page, content } = req.body;
    const userId = req.user.id;

    if (!sessionId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and note content are required'
      });
    }

    const readingSession = await ReadingSession.findOne({
      _id: sessionId,
      user: userId
    });

    if (!readingSession) {
      return res.status(404).json({
        success: false,
        message: 'Reading session not found'
      });
    }

    const note = {
      page: page || readingSession.currentPage,
      content: content.trim(),
      createdAt: new Date()
    };

    if (!readingSession.notes) {
      readingSession.notes = [];
    }

    readingSession.notes.push(note);
    await readingSession.save();

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        note: readingSession.notes[readingSession.notes.length - 1]
      }
    });

  } catch (error) {
    console.error('❌ Add reading note error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reading note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get reading notes for a session
 * @route   GET /api/reading/sessions/:sessionId/notes
 * @access  Private
 */
export const getReadingNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const readingSession = await ReadingSession.findOne({
      _id: sessionId,
      user: userId
    }).select('notes book').populate('book', 'title');

    if (!readingSession) {
      return res.status(404).json({
        success: false,
        message: 'Reading session not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notes: readingSession.notes || [],
        book: {
          id: readingSession.book._id,
          title: readingSession.book.title
        }
      }
    });

  } catch (error) {
    console.error('❌ Get reading notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reading notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to complete reading session (internal use)
async function completeReadingSession(sessionId, userId) {
  const readingSession = await ReadingSession.findById(sessionId);
  if (!readingSession || readingSession.status === 'completed') return;

  readingSession.status = 'completed';
  readingSession.endTime = new Date();
  readingSession.progress = 100;
  await readingSession.save();

  await User.findByIdAndUpdate(userId, {
    $pull: { currentlyReading: { book: readingSession.book } },
    $addToSet: { 
      finishedBooks: {
        book: readingSession.book,
        completedAt: new Date(),
        readingTime: readingSession.totalReadingTime,
        pagesRead: readingSession.pagesRead
      }
    }
  });

  await updateReadingStreak(userId);
}

// Helper function to update reading streak
async function updateReadingStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastReadingDate = user.stats?.lastReadingDate 
    ? new Date(user.stats.lastReadingDate)
    : null;

  let newStreak = user.stats?.readingStreak || 0;

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

  await User.findByIdAndUpdate(userId, {
    $set: {
      'stats.readingStreak': newStreak,
      'stats.lastReadingDate': today
    }
  });
}

// Helper function to calculate reading statistics
async function calculateReadingStatistics(userId) {
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
    favoriteGenres: await getFavoriteGenres(userId)
  };
}

// Helper function to get favorite genres
async function getFavoriteGenres(userId) {
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

  return genreStats.map(genre => ({
    genre: genre._id,
    bookCount: genre.count
  }));
}

// Helper function to get reading goals
async function getReadingGoals(userId) {
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
        progress: Math.round((booksRead / (goals.booksPerYear || 12)) * 100)
      },
      pages: {
        target: (goals.pagesPerDay || 20) * 365,
        completed: pagesRead,
        progress: Math.round((pagesRead / ((goals.pagesPerDay || 20) * 365)) * 100)
      }
    }
  };
}

export default {
  startReadingSession,
  updateReadingProgress,
  pauseReadingSession,
  resumeReadingSession,
  completeReadingSession,
  getCurrentSessions,
  getReadingHistory,
  getReadingStatistics,
  addReadingNote,
  getReadingNotes
};