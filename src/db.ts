import mongoose, { model, Schema, Document } from "mongoose";
import { MONGO_db_URL } from "./config";

export const connectDB = async () => {
  try {
    // @ts-ignore
    await mongoose.connect(MONGO_db_URL);
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
      unique: true,
      required: [true, "Username (email) is required"],
      trim: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"]
    },
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
        enum: ['article', 'video', 'resource', 'other', 'youtube', 'twitter']
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
});

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
