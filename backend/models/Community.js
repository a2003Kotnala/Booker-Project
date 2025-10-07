import mongoose from 'mongoose';

/**
 * Community Model
 * Represents reading groups and communities where users can discuss books
 */

const communityMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'moderator', 'member'],
      message: 'Role must be one of: admin, moderator, member'
    },
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  contributions: {
    discussions: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  bannedAt: Date,
  banReason: String
}, {
  _id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const discussionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  type: {
    type: String,
    enum: {
      values: ['discussion', 'question', 'announcement', 'review', 'poll'],
      message: 'Discussion type must be one of: discussion, question, announcement, review, poll'
    },
    default: 'discussion'
  },
  title: {
    type: String,
    required: [true, 'Discussion title is required'],
    trim: true,
    maxlength: [200, 'Discussion title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Discussion content is required'],
    trim: true,
    maxlength: [5000, 'Discussion content cannot exceed 5000 characters']
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: [true, 'Reply content is required'],
        trim: true,
        maxlength: [500, 'Reply cannot exceed 500 characters']
      },
      likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      isEdited: {
        type: Boolean,
        default: false
      },
      editedAt: Date,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  poll: {
    question: {
      type: String,
      maxlength: [200, 'Poll question cannot exceed 200 characters'],
      trim: true
    },
    options: [{
      text: {
        type: String,
        required: true,
        maxlength: [100, 'Poll option cannot exceed 100 characters'],
        trim: true
      },
      votes: {
        type: Number,
        default: 0,
        min: 0
      },
      voters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    isMultipleChoice: {
      type: Boolean,
      default: false
    },
    endsAt: Date,
    totalVotes: {
      type: Number,
      default: 0,
      min: 0
    }
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const communityEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Event description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['reading_session', 'book_club', 'qna', 'author_chat', 'challenge'],
      message: 'Event type must be one of: reading_session, book_club, qna, author_chat, challenge'
    },
    default: 'reading_session'
  },
  startDate: {
    type: Date,
    required: [true, 'Event start date is required']
  },
  endDate: Date,
  location: {
    type: String,
    enum: ['online', 'in_person', 'hybrid'],
    default: 'online'
  },
  meetingLink: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'interested', 'not_going'],
      default: 'interested'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxAttendees: {
    type: Number,
    min: 0
  },
  isPublic: {
    type: Boolean,
    default: true
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const communitySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Community name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Community name cannot exceed 50 characters'],
    index: true
  },

  description: {
    type: String,
    required: [true, 'Community description is required'],
    trim: true,
    maxlength: [500, 'Community description cannot exceed 500 characters']
  },

  genre: {
    type: String,
    required: [true, 'Community genre is required'],
    trim: true,
    maxlength: [50, 'Community genre cannot exceed 50 characters'],
    index: true
  },

  // Visual Identity
  logo: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please provide a valid URL for the logo'
    }
  },

  banner: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^https?:\/\/.+\..+/.test(v);
      },
      message: 'Please provide a valid URL for the banner'
    }
  },

  color: {
    type: String,
    default: '#6a11cb',
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code']
  },

  // Ownership & Membership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Community creator is required']
  },

  members: [communityMemberSchema],

  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Settings
  isPublic: {
    type: Boolean,
    default: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  maxMembers: {
    type: Number,
    default: 100,
    min: [2, 'Community must allow at least 2 members'],
    max: [10000, 'Community cannot exceed 10000 members']
  },

  joinMethod: {
    type: String,
    enum: ['open', 'approval', 'invite_only'],
    default: 'open'
  },

  // Rules & Guidelines
  rules: [{
    type: String,
    trim: true,
    maxlength: [200, 'Rule cannot exceed 200 characters']
  }],

  guidelines: {
    type: String,
    maxlength: [2000, 'Guidelines cannot exceed 2000 characters'],
    trim: true
  },

  // Current Book
  currentBook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  },

  currentBookStartDate: Date,

  currentBookEndDate: Date,

  currentBookDescription: {
    type: String,
    maxlength: [1000, 'Book description cannot exceed 1000 characters'],
    trim: true
  },

  // Content
  discussions: [discussionSchema],

  events: [communityEventSchema],

  // Tags & Categories
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],

  // Statistics
  statistics: {
    membersCount: {
      type: Number,
      default: 0,
      min: 0
    },
    discussionsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    eventsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    activeMembers: {
      type: Number,
      default: 0,
      min: 0
    },
    booksRead: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Activity Tracking
  lastActivityAt: {
    type: Date,
    default: Date.now
  },

  // Moderation
  reportedContent: [{
    contentType: {
      type: String,
      enum: ['discussion', 'comment', 'reply', 'member'],
      required: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      maxlength: [500, 'Report reason cannot exceed 500 characters'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.invitedUsers;
      delete ret.reportedContent;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ========== INDEXES ==========

// Text search index
communitySchema.index({ 
  name: 'text', 
  description: 'text', 
  genre: 'text',
  tags: 'text'
});

// Compound indexes for common queries
communitySchema.index({ genre: 1, 'statistics.membersCount': -1 });
communitySchema.index({ isPublic: 1, isActive: 1 });
communitySchema.index({ createdBy: 1 });
communitySchema.index({ 'members.user': 1 });
communitySchema.index({ lastActivityAt: -1 });
communitySchema.index({ 'statistics.membersCount': -1 });

// ========== VIRTUAL PROPERTIES ==========

// Active members count
communitySchema.virtual('activeMembersCount').get(function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.members.filter(member => 
    member.lastActiveAt >= thirtyDaysAgo && !member.isBanned
  ).length;
});

// Discussion count by type
communitySchema.virtual('discussionTypeCounts').get(function() {
  const counts = {
    discussion: 0,
    question: 0,
    announcement: 0,
    review: 0,
    poll: 0
  };
  
  this.discussions.forEach(discussion => {
    if (counts.hasOwnProperty(discussion.type)) {
      counts[discussion.type]++;
    }
  });
  
  return counts;
});

// Total likes across all discussions
communitySchema.virtual('totalLikes').get(function() {
  return this.discussions.reduce((total, discussion) => 
    total + discussion.likes.length, 0
  );
});

// Total comments across all discussions
communitySchema.virtual('totalComments').get(function() {
  return this.discussions.reduce((total, discussion) => 
    total + discussion.comments.length + 
    discussion.comments.reduce((commentTotal, comment) => 
      commentTotal + comment.replies.length, 0
    ), 0
  );
});

// Is community full
communitySchema.virtual('isFull').get(function() {
  return this.members.length >= this.maxMembers;
});

// Can user join (based on join method and invitation)
communitySchema.virtual('canUserJoin').get(function() {
  if (this.joinMethod === 'open') return true;
  if (this.joinMethod === 'approval') return true; // They can request to join
  return false; // invite_only requires invitation
});

// Upcoming events
communitySchema.virtual('upcomingEvents').get(function() {
  const now = new Date();
  return this.events
    .filter(event => event.startDate >= now)
    .sort((a, b) => a.startDate - b.startDate);
});

// Current book progress (if applicable)
communitySchema.virtual('currentBookProgress').get(function() {
  if (!this.currentBookStartDate || !this.currentBookEndDate) {
    return null;
  }
  
  const now = new Date();
  const totalDuration = this.currentBookEndDate - this.currentBookStartDate;
  const elapsedDuration = now - this.currentBookStartDate;
  
  if (elapsedDuration <= 0) return 0;
  if (elapsedDuration >= totalDuration) return 100;
  
  return Math.round((elapsedDuration / totalDuration) * 100);
});

// ========== PRE-SAVE MIDDLEWARE ==========

communitySchema.pre('save', function(next) {
  // Update members count
  this.statistics.membersCount = this.members.filter(member => !member.isBanned).length;
  
  // Update discussions count
  this.statistics.discussionsCount = this.discussions.length;
  
  // Update comments count
  this.statistics.commentsCount = this.totalComments;
  
  // Update events count
  this.statistics.eventsCount = this.events.length;
  
  // Update active members
  this.statistics.activeMembers = this.activeMembersCount;
  
  // Update last activity
  this.updateLastActivity();
  
  // Generate search tags if not provided
  if (this.tags.length === 0) {
    this.generateTags();
  }
  
  next();
});

communitySchema.pre('save', function(next) {
  // Update discussion updatedAt
  if (this.isModified('discussions')) {
    this.discussions.forEach(discussion => {
      discussion.updatedAt = new Date();
    });
  }
  
  // Update event updatedAt
  if (this.isModified('events')) {
    this.events.forEach(event => {
      event.updatedAt = new Date();
    });
  }
  
  next();
});

// ========== INSTANCE METHODS ==========

/**
 * Add a member to the community
 */
communitySchema.methods.addMember = function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    if (existingMember.isBanned) {
      throw new Error('User is banned from this community');
    }
    return this; // Already a member
  }
  
  // Check if community is full
  if (this.members.length >= this.maxMembers) {
    throw new Error('Community has reached maximum member limit');
  }
  
  this.members.push({
    user: userId,
    role,
    joinedAt: new Date(),
    lastActiveAt: new Date()
  });
  
  return this.save();
};

/**
 * Remove a member from the community
 */
communitySchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(member => 
    member.user.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this community');
  }
  
  // Prevent removing the creator
  if (this.members[memberIndex].user.toString() === this.createdBy.toString()) {
    throw new Error('Cannot remove community creator');
  }
  
  this.members.splice(memberIndex, 1);
  return this.save();
};

/**
 * Update member role
 */
communitySchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('User is not a member of this community');
  }
  
  member.role = newRole;
  return this.save();
};

/**
 * Ban a member
 */
communitySchema.methods.banMember = function(userId, reason = '') {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('User is not a member of this community');
  }
  
  if (member.user.toString() === this.createdBy.toString()) {
    throw new Error('Cannot ban community creator');
  }
  
  member.isBanned = true;
  member.bannedAt = new Date();
  member.banReason = reason;
  
  return this.save();
};

/**
 * Unban a member
 */
communitySchema.methods.unbanMember = function(userId) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('User is not a member of this community');
  }
  
  member.isBanned = false;
  member.bannedAt = undefined;
  member.banReason = undefined;
  
  return this.save();
};

/**
 * Create a new discussion
 */
communitySchema.methods.createDiscussion = function(userId, title, content, type = 'discussion', bookId = null, tags = []) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString() && !m.isBanned
  );
  
  if (!member) {
    throw new Error('Only members can create discussions');
  }
  
  const discussion = {
    user: userId,
    type,
    title: title.trim(),
    content: content.trim(),
    tags: tags.slice(0, 10), // Limit to 10 tags
    createdAt: new Date(),
    updatedAt: new Date(),
    comments: []
  };
  
  if (bookId) {
    discussion.book = bookId;
  }
  
  this.discussions.unshift(discussion);
  member.contributions.discussions += 1;
  
  this.updateLastActivity();
  return this.save();
};

/**
 * Add comment to discussion
 */
communitySchema.methods.addComment = function(discussionId, userId, content) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString() && !m.isBanned
  );
  
  if (!member) {
    throw new Error('Only members can comment');
  }
  
  const discussion = this.discussions.id(discussionId);
  if (!discussion) {
    throw new Error('Discussion not found');
  }
  
  if (discussion.isLocked) {
    throw new Error('Discussion is locked');
  }
  
  discussion.comments.push({
    user: userId,
    content: content.trim(),
    createdAt: new Date(),
    replies: []
  });
  
  discussion.updatedAt = new Date();
  member.contributions.comments += 1;
  member.lastActiveAt = new Date();
  
  this.updateLastActivity();
  return this.save();
};

/**
 * Like/unlike a discussion
 */
communitySchema.methods.toggleDiscussionLike = function(discussionId, userId) {
  const discussion = this.discussions.id(discussionId);
  if (!discussion) {
    throw new Error('Discussion not found');
  }
  
  const likeIndex = discussion.likes.indexOf(userId);
  const member = this.members.find(m => m.user.toString() === userId.toString());
  
  if (likeIndex > -1) {
    // Unlike
    discussion.likes.splice(likeIndex, 1);
    if (member) {
      member.contributions.likes = Math.max(0, member.contributions.likes - 1);
    }
  } else {
    // Like
    discussion.likes.push(userId);
    if (member) {
      member.contributions.likes += 1;
      member.lastActiveAt = new Date();
    }
  }
  
  this.updateLastActivity();
  return this.save();
};

/**
 * Set current book for community
 */
communitySchema.methods.setCurrentBook = function(bookId, startDate, endDate, description = '') {
  this.currentBook = bookId;
  this.currentBookStartDate = startDate ? new Date(startDate) : new Date();
  this.currentBookEndDate = endDate ? new Date(endDate) : null;
  this.currentBookDescription = description.trim();
  
  // Create announcement
  this.createDiscussion(
    this.createdBy,
    `New Book Selection: ${this.currentBook}`,
    description || `We're starting a new book! Join us in reading our latest selection.`,
    'announcement',
    bookId
  );
  
  return this.save();
};

/**
 * Create a new event
 */
communitySchema.methods.createEvent = function(userId, title, description, type, startDate, endDate = null, location = 'online', maxAttendees = null) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString() && !m.isBanned
  );
  
  if (!member) {
    throw new Error('Only members can create events');
  }
  
  if (!['admin', 'moderator'].includes(member.role) && type === 'author_chat') {
    throw new Error('Only admins and moderators can create author chat events');
  }
  
  const event = {
    title: title.trim(),
    description: description?.trim(),
    type,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    location,
    createdBy: userId,
    attendees: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  if (maxAttendees) {
    event.maxAttendees = maxAttendees;
  }
  
  this.events.push(event);
  this.updateLastActivity();
  return this.save();
};

/**
 * RSVP to an event
 */
communitySchema.methods.rsvpToEvent = function(eventId, userId, status = 'interested') {
  const event = this.events.id(eventId);
  if (!event) {
    throw new Error('Event not found');
  }
  
  const member = this.members.find(m => 
    m.user.toString() === userId.toString() && !m.isBanned
  );
  
  if (!member) {
    throw new Error('Only members can RSVP to events');
  }
  
  // Check if event is full
  if (event.maxAttendees && event.attendees.length >= event.maxAttendees && status === 'going') {
    throw new Error('Event is full');
  }
  
  const existingRSVP = event.attendees.find(attendee => 
    attendee.user.toString() === userId.toString()
  );
  
  if (existingRSVP) {
    existingRSVP.status = status;
    existingRSVP.joinedAt = new Date();
  } else {
    event.attendees.push({
      user: userId,
      status,
      joinedAt: new Date()
    });
  }
  
  event.updatedAt = new Date();
  member.lastActiveAt = new Date();
  
  this.updateLastActivity();
  return this.save();
};

/**
 * Update last activity timestamp
 */
communitySchema.methods.updateLastActivity = function() {
  this.lastActivityAt = new Date();
};

/**
 * Generate tags based on community content
 */
communitySchema.methods.generateTags = function() {
  const tags = new Set();
  
  // Add genre
  tags.add(this.genre.toLowerCase());
  
  // Add from discussions
  this.discussions.forEach(discussion => {
    discussion.tags.forEach(tag => tags.add(tag.toLowerCase()));
  });
  
  this.tags = Array.from(tags).slice(0, 15); // Limit to 15 tags
};

/**
 * Check if user is member
 */
communitySchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && !member.isBanned
  );
};

/**
 * Check if user is admin or moderator
 */
communitySchema.methods.isModerator = function(userId) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString() && !m.isBanned
  );
  
  return member && ['admin', 'moderator'].includes(member.role);
};

/**
 * Check if user is admin
 */
communitySchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => 
    m.user.toString() === userId.toString() && !m.isBanned
  );
  
  return member && member.role === 'admin';
};

// ========== STATIC METHODS ==========

/**
 * Find communities by genre
 */
communitySchema.statics.findByGenre = function(genre, limit = 20, page = 1) {
  return this.find({ 
    genre: new RegExp(genre, 'i'),
    isPublic: true,
    isActive: true
  })
  .populate('createdBy', 'username profile avatar')
  .populate('members.user', 'username profile avatar')
  .sort({ 'statistics.membersCount': -1, lastActivityAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
};

/**
 * Find trending communities
 */
communitySchema.statics.findTrending = function(limit = 10) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return this.find({
    isPublic: true,
    isActive: true,
    lastActivityAt: { $gte: sevenDaysAgo }
  })
  .populate('createdBy', 'username profile avatar')
  .sort({ 'statistics.activeMembers': -1, lastActivityAt: -1 })
  .limit(limit);
};

/**
 * Find communities by member count
 */
communitySchema.statics.findByMemberCount = function(minMembers = 0, maxMembers = 10000, limit = 20) {
  return this.find({
    isPublic: true,
    isActive: true,
    'statistics.membersCount': { $gte: minMembers, $lte: maxMembers }
  })
  .populate('createdBy', 'username profile avatar')
  .sort({ 'statistics.membersCount': -1 })
  .limit(limit);
};

/**
 * Search communities
 */
communitySchema.statics.search = function(query, options = {}) {
  const { 
    limit = 20, 
    page = 1, 
    genre,
    minMembers = 0,
    isPublic = true
  } = options;
  
  const searchFilter = {
    $text: { $search: query },
    isActive: true
  };
  
  if (isPublic !== undefined) {
    searchFilter.isPublic = isPublic;
  }
  
  if (genre) {
    searchFilter.genre = new RegExp(genre, 'i');
  }
  
  if (minMembers > 0) {
    searchFilter['statistics.membersCount'] = { $gte: minMembers };
  }
  
  return this.find(searchFilter)
    .populate('createdBy', 'username profile avatar')
    .populate('members.user', 'username profile avatar')
    .select({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .skip((page - 1) * limit);
};

/**
 * Get user's communities
 */
communitySchema.statics.findByUserId = function(userId) {
  return this.find({
    'members.user': userId,
    'members.isBanned': false
  })
  .populate('createdBy', 'username profile avatar')
  .populate('currentBook', 'title author coverImage')
  .sort({ lastActivityAt: -1 });
};

/**
 * Get community statistics
 */
communitySchema.statics.getGlobalStats = function() {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        isPublic: true
      }
    },
    {
      $group: {
        _id: null,
        totalCommunities: { $sum: 1 },
        totalMembers: { $sum: '$statistics.membersCount' },
        totalDiscussions: { $sum: '$statistics.discussionsCount' },
        averageMembers: { $avg: '$statistics.membersCount' }
      }
    }
  ]);
};

export default mongoose.model('Community', communitySchema);