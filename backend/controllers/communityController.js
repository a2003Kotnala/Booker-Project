import Community from '../models/Community.js';
import User from '../models/User.js';
import Book from '../models/Book.js';
import { validationResult } from 'express-validator';

/**
 * Community Controller
 * Handles reading groups, discussions, and community features
 */

/**
 * @desc    Create a new community/reading group
 * @route   POST /api/communities
 * @access  Private
 */
export const createCommunity = async (req, res) => {
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
      name,
      description,
      genre,
      isPublic = true,
      maxMembers,
      rules,
      tags = []
    } = req.body;

    const userId = req.user.id;

    // Check if community name already exists
    const existingCommunity = await Community.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCommunity) {
      return res.status(409).json({
        success: false,
        message: 'A community with this name already exists'
      });
    }

    // Create new community
    const community = new Community({
      name: name.trim(),
      description: description?.trim(),
      genre: genre?.trim(),
      createdBy: userId,
      isPublic,
      maxMembers: maxMembers || 100,
      rules: rules || [
        'Be respectful to all members',
        'No spam or self-promotion',
        'Keep discussions book-related',
        'No spoilers without warnings'
      ],
      tags: tags.slice(0, 10), // Limit to 10 tags
      members: [{
        user: userId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await community.save();

    // Add community to user's joined communities
    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        joinedCommunities: {
          community: community._id,
          role: 'admin',
          joinedAt: new Date()
        }
      }
    });

    // Populate community data for response
    await community.populate('createdBy', 'username profile avatar');
    await community.populate('members.user', 'username profile avatar');

    console.log(`🏘️ New community created: "${community.name}" by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Community created successfully',
      data: { community }
    });

  } catch (error) {
    console.error('❌ Create community error:', error);
    
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
      message: 'Error creating community',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all communities with filtering and pagination
 * @route   GET /api/communities
 * @access  Public
 */
export const getCommunities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre,
      search,
      sortBy = 'membersCount',
      sortOrder = 'desc',
      isPublic = true
    } = req.query;

    // Build filter object
    const filter = { isPublic: isPublic !== 'false' };
    
    if (genre) {
      filter.genre = { $regex: genre, $options: 'i' };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    if (sortBy === 'membersCount') {
      sort.membersCount = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'createdAt') {
      sort.createdAt = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'name') {
      sort.name = sortOrder === 'asc' ? 1 : -1;
    }

    // Get communities with population
    const communities = await Community.find(filter)
      .populate('createdBy', 'username profile avatar')
      .populate('members.user', 'username profile avatar')
      .sort(sort)
      .limit(parseInt(limit) * 1)
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Community.countDocuments(filter);

    // Check if user is member of each community (if authenticated)
    let communitiesWithMembership = communities;
    if (req.user) {
      communitiesWithMembership = await Promise.all(
        communities.map(async (community) => {
          const isMember = community.members.some(
            member => member.user._id.toString() === req.user.id
          );
          const userRole = isMember 
            ? community.members.find(member => member.user._id.toString() === req.user.id).role
            : null;
          
          return {
            ...community.toObject(),
            userMembership: {
              isMember,
              role: userRole
            }
          };
        })
      );
    }

    res.status(200).json({
      success: true,
      data: {
        communities: communitiesWithMembership,
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
    console.error('❌ Get communities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching communities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get community details by ID
 * @route   GET /api/communities/:id
 * @access  Public
 */
export const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await Community.findById(id)
      .populate('createdBy', 'username profile avatar')
      .populate('members.user', 'username profile avatar')
      .populate('currentBook', 'title author coverImage')
      .populate('discussions.user', 'username profile avatar')
      .populate('events.createdBy', 'username profile avatar');

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is member (if authenticated)
    let userMembership = null;
    if (req.user) {
      const member = community.members.find(
        m => m.user._id.toString() === req.user.id
      );
      if (member) {
        userMembership = {
          isMember: true,
          role: member.role,
          joinedAt: member.joinedAt
        };
      } else {
        userMembership = { isMember: false };
      }
    }

    // Increment view count
    community.views += 1;
    await community.save();

    res.status(200).json({
      success: true,
      data: {
        community: {
          ...community.toObject(),
          userMembership
        }
      }
    });

  } catch (error) {
    console.error('❌ Get community by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Join a community
 * @route   POST /api/communities/:id/join
 * @access  Private
 */
export const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findById(id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if community is private
    if (!community.isPublic && !community.invitedUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'This is a private community. You need an invitation to join.'
      });
    }

    // Check if user is already a member
    const isAlreadyMember = community.members.some(
      member => member.user.toString() === userId
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this community'
      });
    }

    // Check if community has reached member limit
    if (community.members.length >= community.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'This community has reached its maximum member limit'
      });
    }

    // Add user to community members
    community.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });

    // Update members count
    community.membersCount = community.members.length;
    await community.save();

    // Add community to user's joined communities
    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        joinedCommunities: {
          community: community._id,
          role: 'member',
          joinedAt: new Date()
        }
      },
      $inc: { 'stats.communitiesJoined': 1 }
    });

    // Populate for response
    await community.populate('members.user', 'username profile avatar');

    console.log(`👥 User joined community: ${req.user.username} -> ${community.name}`);

    // Create join announcement
    community.discussions.push({
      user: userId,
      type: 'announcement',
      content: `${req.user.username} joined the community!`,
      createdAt: new Date()
    });
    await community.save();

    res.status(200).json({
      success: true,
      message: 'Successfully joined the community',
      data: { community }
    });

  } catch (error) {
    console.error('❌ Join community error:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining community',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Leave a community
 * @route   POST /api/communities/:id/leave
 * @access  Private
 */
export const leaveCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findById(id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is a member
    const memberIndex = community.members.findIndex(
      member => member.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this community'
      });
    }

    // Check if user is the creator
    if (community.createdBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Community creator cannot leave. Transfer ownership or delete the community instead.'
      });
    }

    // Remove user from community members
    community.members.splice(memberIndex, 1);
    community.membersCount = community.members.length;
    await community.save();

    // Remove community from user's joined communities
    await User.findByIdAndUpdate(userId, {
      $pull: {
        joinedCommunities: { community: community._id }
      },
      $inc: { 'stats.communitiesJoined': -1 }
    });

    console.log(`👋 User left community: ${req.user.username} -> ${community.name}`);

    res.status(200).json({
      success: true,
      message: 'Successfully left the community',
      data: { communityId: id }
    });

  } catch (error) {
    console.error('❌ Leave community error:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving community',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Create a discussion post in community
 * @route   POST /api/communities/:id/discussions
 * @access  Private
 */
export const createDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type = 'discussion', bookId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Discussion content is required'
      });
    }

    const community = await Community.findById(id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is a member
    const isMember = community.members.some(
      member => member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to post in this community'
      });
    }

    // Create discussion object
    const discussion = {
      user: userId,
      type,
      content: content.trim(),
      createdAt: new Date(),
      likes: [],
      comments: []
    };

    // Add book reference if provided
    if (bookId) {
      const book = await Book.findById(bookId);
      if (book) {
        discussion.book = bookId;
      }
    }

    // Add discussion to community
    community.discussions.unshift(discussion);
    await community.save();

    // Populate the new discussion for response
    await community.populate('discussions.user', 'username profile avatar');
    if (bookId) {
      await community.populate('discussions.book', 'title author coverImage');
    }

    const newDiscussion = community.discussions[0];

    console.log(`💬 New discussion in ${community.name} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Discussion created successfully',
      data: { discussion: newDiscussion }
    });

  } catch (error) {
    console.error('❌ Create discussion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating discussion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get community discussions
 * @route   GET /api/communities/:id/discussions
 * @access  Public
 */
export const getDiscussions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const community = await Community.findById(id)
      .populate('discussions.user', 'username profile avatar')
      .populate('discussions.book', 'title author coverImage')
      .populate('discussions.comments.user', 'username profile avatar');

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Filter discussions by type if provided
    let discussions = community.discussions;
    if (type) {
      discussions = discussions.filter(discussion => discussion.type === type);
    }

    // Paginate discussions
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedDiscussions = discussions.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        discussions: paginatedDiscussions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(discussions.length / parseInt(limit)),
          total: discussions.length,
          hasNext: endIndex < discussions.length,
          hasPrev: startIndex > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Get discussions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching discussions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Like/unlike a discussion
 * @route   POST /api/communities/:id/discussions/:discussionId/like
 * @access  Private
 */
export const toggleDiscussionLike = async (req, res) => {
  try {
    const { id, discussionId } = req.params;
    const userId = req.user.id;

    const community = await Community.findById(id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Find the discussion
    const discussion = community.discussions.id(discussionId);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Check if user already liked the discussion
    const likeIndex = discussion.likes.indexOf(userId);
    let action = '';

    if (likeIndex > -1) {
      // Unlike
      discussion.likes.splice(likeIndex, 1);
      action = 'unliked';
    } else {
      // Like
      discussion.likes.push(userId);
      action = 'liked';
    }

    await community.save();

    res.status(200).json({
      success: true,
      message: `Discussion ${action} successfully`,
      data: {
        likesCount: discussion.likes.length,
        isLiked: action === 'liked'
      }
    });

  } catch (error) {
    console.error('❌ Toggle discussion like error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling discussion like',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Add comment to discussion
 * @route   POST /api/communities/:id/discussions/:discussionId/comments
 * @access  Private
 */
export const addComment = async (req, res) => {
  try {
    const { id, discussionId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    const community = await Community.findById(id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is a member
    const isMember = community.members.some(
      member => member.user.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to comment in this community'
      });
    }

    // Find the discussion
    const discussion = community.discussions.id(discussionId);
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      });
    }

    // Add comment
    discussion.comments.push({
      user: userId,
      content: content.trim(),
      createdAt: new Date()
    });

    await community.save();

    // Populate the new comment for response
    await community.populate('discussions.comments.user', 'username profile avatar');
    const updatedDiscussion = community.discussions.id(discussionId);
    const newComment = updatedDiscussion.comments[updatedDiscussion.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: newComment }
    });

  } catch (error) {
    console.error('❌ Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Set current book for community
 * @route   PUT /api/communities/:id/current-book
 * @access  Private (Admin only)
 */
export const setCurrentBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookId, startDate, endDate, description } = req.body;
    const userId = req.user.id;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'Book ID is required'
      });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Check if user is admin
    const userMember = community.members.find(
      member => member.user.toString() === userId
    );

    if (!userMember || !['admin', 'moderator'].includes(userMember.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and moderators can set the current book'
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

    // Set current book
    community.currentBook = bookId;
    community.currentBookStartDate = startDate ? new Date(startDate) : new Date();
    community.currentBookEndDate = endDate ? new Date(endDate) : null;
    community.currentBookDescription = description?.trim();

    await community.save();

    // Create book announcement
    community.discussions.unshift({
      user: userId,
      type: 'announcement',
      content: `New book selected: "${book.title}" by ${book.primaryAuthor}`,
      book: bookId,
      createdAt: new Date()
    });
    await community.save();

    // Populate for response
    await community.populate('currentBook', 'title author coverImage description');

    console.log(`📚 Current book set for ${community.name}: ${book.title}`);

    res.status(200).json({
      success: true,
      message: 'Current book set successfully',
      data: { community }
    });

  } catch (error) {
    console.error('❌ Set current book error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting current book',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get community statistics
 * @route   GET /api/communities/:id/statistics
 * @access  Public
 */
export const getCommunityStats = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    // Calculate statistics
    const stats = {
      totalMembers: community.membersCount,
      totalDiscussions: community.discussions.length,
      totalComments: community.discussions.reduce(
        (total, discussion) => total + discussion.comments.length, 0
      ),
      totalLikes: community.discussions.reduce(
        (total, discussion) => total + discussion.likes.length, 0
      ),
      activeMembers: await getActiveMembersCount(id),
      discussionTypes: getDiscussionTypeStats(community.discussions)
    };

    res.status(200).json({
      success: true,
      data: { statistics: stats }
    });

  } catch (error) {
    console.error('❌ Get community stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get user's communities
 * @route   GET /api/communities/user/joined
 * @access  Private
 */
export const getUserCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(userId)
      .populate({
        path: 'joinedCommunities.community',
        populate: [
          { path: 'createdBy', select: 'username profile avatar' },
          { path: 'currentBook', select: 'title author coverImage' }
        ]
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const joinedCommunities = user.joinedCommunities || [];

    // Paginate results
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCommunities = joinedCommunities.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        communities: paginatedCommunities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(joinedCommunities.length / parseInt(limit)),
          total: joinedCommunities.length,
          hasNext: endIndex < joinedCommunities.length,
          hasPrev: startIndex > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user communities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user communities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to get active members count
async function getActiveMembersCount(communityId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const community = await Community.findById(communityId)
    .populate('discussions.user', '_id')
    .populate('discussions.comments.user', '_id');

  if (!community) return 0;

  const activeUserIds = new Set();

  // Check discussions in last 30 days
  community.discussions
    .filter(discussion => discussion.createdAt >= thirtyDaysAgo)
    .forEach(discussion => {
      activeUserIds.add(discussion.user._id.toString());
      discussion.comments
        .filter(comment => comment.createdAt >= thirtyDaysAgo)
        .forEach(comment => {
          activeUserIds.add(comment.user._id.toString());
        });
    });

  return activeUserIds.size;
}

// Helper function to get discussion type statistics
function getDiscussionTypeStats(discussions) {
  const typeStats = {
    discussion: 0,
    question: 0,
    announcement: 0,
    review: 0
  };

  discussions.forEach(discussion => {
    if (typeStats.hasOwnProperty(discussion.type)) {
      typeStats[discussion.type]++;
    } else {
      typeStats.discussion++; // Default to discussion
    }
  });

  return typeStats;
}

export default {
  createCommunity,
  getCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  createDiscussion,
  getDiscussions,
  toggleDiscussionLike,
  addComment,
  setCurrentBook,
  getCommunityStats,
  getUserCommunities
};