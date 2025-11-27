import mongoose, { model, Schema } from "mongoose";
import { MONGO_db_URL } from "./config";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_db_URL as string);
    console.log("MongoDB connected successfully.");
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
    }
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
        enum: ['article', 'video', 'resource', 'other', 'youtube', 'twitter'],
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
  }
}, { 
  timestamps: true  // Add createdAt and updatedAt
});

// Compound indexes for common query patterns
ContentSchema.index({ userId: 1, createdAt: -1 }); // Feed queries
ContentSchema.index({ userId: 1, type: 1 }); // Type filtering
ContentSchema.index({ tags: 1, userId: 1 }); // Tag filtering
ContentSchema.index({ createdAt: -1 }); // Timeline queries

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
