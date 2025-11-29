import mongoose, { model, Schema } from "mongoose";
import { MONGO_db_URL } from "./config";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_db_URL as string, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 10000,
      retryWrites: true,
      retryReads: true,
    });
    console.log("MongoDB connected successfully.");

    // Log connection pool stats periodically
    setInterval(() => {
      console.log('MongoDB connection status:', {
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
        name: mongoose.connection.name
      });
    }, 60000); // Every 60 seconds

    // Monitor connection events
    mongoose.connection.on('disconnected', () => {
      console.error('MongoDB disconnected! Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully.');
    });

  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [3, "Username must be at least 3 characters"]
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"]
    },
    profilePic: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"]
    },
    followers: [{
      type: Schema.Types.ObjectId,
      ref: "User"
    }],
    following: [{
      type: Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true }
);

export const UserModel = model("User", UserSchema);

const TagSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  }
});

export const TagModel = model("Tag", TagSchema);

const ContentSchema = new Schema({
  title: {
    type: String,
    required: [true, "Content title is required"],
    trim: true
  },
  link: {
    type: String,
    required: [true, "Content link is required"],
    trim: true
  },
  type: {
    type: String,
    required: [true, "Content type is required"],
        enum: ['article', 'video', 'resource', 'other', 'youtube', 'twitter', 'instagram', 'tiktok', 'linkedin', 'reddit', 'medium', 'github', 'codepen', 'spotify', 'soundcloud', 'vimeo', 'twitch', 'facebook', 'pinterest'],
    index: true  // Index for type-based queries
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isFavorite: {
    type: Boolean,
    default: false,
    index: true  // Index for favorite filtering
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true  // Index for archive filtering
  },
  notes: {
    type: String,
    default: "",
    maxlength: [1000, "Notes cannot exceed 1000 characters"]
  }
}, { 
  timestamps: true  // Add createdAt and updatedAt
});

// Compound indexes for common query patterns
ContentSchema.index({ userId: 1, createdAt: -1 }); // Feed queries
ContentSchema.index({ userId: 1, type: 1 }); // Type filtering
ContentSchema.index({ tags: 1, userId: 1 }); // Tag filtering
ContentSchema.index({ createdAt: -1 }); // Timeline queries
ContentSchema.index({ userId: 1, isFavorite: 1 }); // Favorite filtering
ContentSchema.index({ userId: 1, isArchived: 1 }); // Archive filtering

export const ContentModel = model("Content", ContentSchema);

const LinkSchema = new Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
});

export const LinkModel = model("Links", LinkSchema);

const NotificationSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['follow', 'content'],
    index: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

// Compound index for querying user's unread notifications
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = model("Notification", NotificationSchema);

const CollectionSchema = new Schema({
  name: {
    type: String,
    required: [true, "Collection name is required"],
    trim: true,
    maxlength: [100, "Collection name cannot exceed 100 characters"]
  },
  description: {
    type: String,
    default: "",
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  color: {
    type: String,
    default: "#8B5CF6", // Default purple
    match: [/^#[0-9A-F]{6}$/i, "Color must be a valid hex color"]
  },
  icon: {
    type: String,
    default: "📁"
  },
  contentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound indexes for queries
CollectionSchema.index({ userId: 1, order: 1 }); // User's collections ordered
CollectionSchema.index({ userId: 1, createdAt: -1 }); // Recent collections

export const CollectionModel = model("Collection", CollectionSchema);
