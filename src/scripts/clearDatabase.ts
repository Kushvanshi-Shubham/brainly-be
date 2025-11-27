import mongoose from "mongoose";
import { UserModel, ContentModel, TagModel } from "../db";
import dotenv from "dotenv";

dotenv.config();

async function clearDatabase() {
  try {
    const MONGO_URL = process.env.MONGO_URL;
    
    if (!MONGO_URL) {
      console.error("❌ MONGO_URL is not defined in environment variables");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    console.log("\n🗑️  Clearing database...");
    
    // Delete all users
    const usersDeleted = await UserModel.deleteMany({});
    console.log(`✅ Deleted ${usersDeleted.deletedCount} users`);
    
    // Delete all content
    const contentDeleted = await ContentModel.deleteMany({});
    console.log(`✅ Deleted ${contentDeleted.deletedCount} content items`);
    
    // Delete all tags
    const tagsDeleted = await TagModel.deleteMany({});
    console.log(`✅ Deleted ${tagsDeleted.deletedCount} tags`);

    console.log("\n✨ Database cleared successfully!");
    
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

clearDatabase();
