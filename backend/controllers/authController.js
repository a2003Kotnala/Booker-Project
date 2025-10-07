import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import ReadingSession from '../models/ReadingSession.js';

/**
 * Authentication Controller
 * Handles user registration, login, profile management, and session management
 */

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000) // Issued at time
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'bookifyme-api',
      subject: userId.toString()
    }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Remove password from output
  user.password = undefined;

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .cookie('refreshToken', refreshToken, { ...cookieOptions, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
    .json({
      success: true,
      message: statusCode === 201 ? 'User registered successfully' : 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          preferences: user.preferences,
          isAdmin: user.isAdmin,
          stats: user.stats
        }
      }
    });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName,
      favoriteGenres = [],
      favoriteAuthors = []
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        message: `User with this ${field} already exists`,
        field: field
      });
    }

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      profile: {
        firstName: firstName?.trim(),
        lastName: lastName?.trim()
      },
      preferences: {
        favoriteGenres: favoriteGenres.slice(0, 10), // Limit to 10 genres
        favoriteAuthors: favoriteAuthors.slice(0, 10) // Limit to 10 authors
      }
    });

    await user.save();

    // Create welcome reading session or initial data if needed
    try {
      // You can add welcome books or initial setup here
      console.log(`🎉 New user registered: ${user.username} (${user.email})`);
    } catch (setupError) {
      console.error('Error in user setup:', setupError);
      // Don't fail registration if setup fails
    }

    // Send token response
    sendTokenResponse(user, 201, res);

  } catch (error) {
    console.error('❌ Registration error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `User with this ${field} already exists`,
        field: field
      });
    }

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
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;

    // Find user by email (case insensitive)
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        field: 'email'
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        field: 'password'
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Log login activity
    console.log(`🔐 User logged in: ${user.username} (${user.email})`);

    // Send token response
    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Logout user / Clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // In a stateless JWT system, we just clear the cookies
    // For blacklisting tokens, you'd need a token blacklist system
    
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true
    });

    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    console.log(`👋 User logged out: ${req.user.username}`);

    res.status(200).json({
      success: true,
      message: 'User logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('readingSessions', 'book progress duration createdAt')
      .populate('currentlyReading.book', 'title author coverImage pages')
      .populate('wantToRead', 'title author coverImage')
      .populate('finishedBooks.book', 'title author coverImage pages genres');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate reading statistics
    const totalReadingTime = user.readingSessions?.reduce((total, session) => 
      total + (session.duration || 0), 0) || 0;

    const booksRead = user.finishedBooks?.length || 0;
    const totalPagesRead = user.finishedBooks?.reduce((total, item) => 
      total + (item.book?.pages || 0), 0) || 0;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          preferences: user.preferences,
          isAdmin: user.isAdmin,
          stats: {
            ...user.stats,
            totalReadingTime: Math.round(totalReadingTime / 60), // Convert to minutes
            booksRead,
            totalPagesRead,
            readingStreak: user.stats?.readingStreak || 0,
            averageRating: user.stats?.averageRating || 0
          },
          currentlyReading: user.currentlyReading || [],
          wantToRead: user.wantToRead || [],
          finishedBooks: user.finishedBooks || [],
          joinedCommunities: user.joinedCommunities || [],
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      bio,
      avatar,
      favoriteGenres,
      favoriteAuthors,
      readingGoals
    } = req.body;

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

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { 
        new: true,
        runValidators: true
      }
    ).select('-password');

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
    console.error('❌ Update profile error:', error);

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
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Find user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        field: 'currentPassword'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`🔑 Password changed for: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public (with refresh token)
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile
        }
      }
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error refreshing token'
    });
  }
};

/**
 * @desc    Check username availability
 * @route   GET /api/auth/check-username/:username
 * @access  Public
 */
export const checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
    }

    const existingUser = await User.findOne({ 
      username: username.toLowerCase() 
    });

    res.status(200).json({
      success: true,
      data: {
        available: !existingUser,
        username: username
      }
    });

  } catch (error) {
    console.error('❌ Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking username availability'
    });
  }
};

/**
 * @desc    Verify token validity
 * @route   GET /api/auth/verify
 * @access  Private
 */
export const verifyToken = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          profile: req.user.profile,
          isAdmin: req.user.isAdmin
        }
      }
    });
  } catch (error) {
    console.error('❌ Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
};

export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  checkUsernameAvailability,
  verifyToken
};