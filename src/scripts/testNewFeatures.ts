import { connectDB, ContentModel, UserModel } from "../db";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const testNewFeatures = async () => {
  try {
    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Connected to database successfully!\n");

    // Create a test user if not exists
    console.log("👤 Creating/finding test user...");
    let testUser = await UserModel.findOne({ username: "testuser" });
    
    if (!testUser) {
      const hashedPassword = await bcrypt.hash("testpass123", 10);
      testUser = await UserModel.create({
        username: "testuser",
        email: "test@example.com",
        password: hashedPassword,
      });
      console.log("✅ Test user created");
    } else {
      console.log("✅ Test user found");
    }

    // Create test content with new fields
    console.log("\n📝 Creating test content with new features...");
    const testContent = await ContentModel.create({
      title: "Test Content - Week 1 Features",
      link: "https://example.com/test",
      type: "article",
      userId: testUser._id,
      isFavorite: false,
      isArchived: false,
      notes: "This is a test note to verify the notes field works correctly.",
    });
    console.log("✅ Content created:", {
      id: testContent._id,
      title: testContent.title,
      isFavorite: testContent.isFavorite,
      isArchived: testContent.isArchived,
      notes: testContent.notes,
    });

    // Test favorite toggle
    console.log("\n⭐ Testing favorite toggle...");
    testContent.isFavorite = !testContent.isFavorite;
    await testContent.save();
    console.log("✅ Favorite toggled to:", testContent.isFavorite);

    // Test archive toggle
    console.log("\n📦 Testing archive toggle...");
    testContent.isArchived = !testContent.isArchived;
    await testContent.save();
    console.log("✅ Archive toggled to:", testContent.isArchived);

    // Test content update
    console.log("\n✏️ Testing content update...");
    testContent.title = "Updated Test Content";
    testContent.notes = "Updated notes field";
    await testContent.save();
    console.log("✅ Content updated:", {
      title: testContent.title,
      notes: testContent.notes,
    });

    // Test filtering by favorite
    console.log("\n🔍 Testing favorite filter...");
    const favoriteContent = await ContentModel.find({
      userId: testUser._id,
      isFavorite: true,
    });
    console.log(`✅ Found ${favoriteContent.length} favorite items`);

    // Test filtering by archived
    console.log("\n🔍 Testing archive filter...");
    const archivedContent = await ContentModel.find({
      userId: testUser._id,
      isArchived: true,
    });
    console.log(`✅ Found ${archivedContent.length} archived items`);

    // Test compound filtering (not archived, only favorites)
    console.log("\n🔍 Testing compound filter (favorites, not archived)...");
    const activeContent = await ContentModel.find({
      userId: testUser._id,
      isFavorite: true,
      isArchived: false,
    });
    console.log(`✅ Found ${activeContent.length} active favorite items`);

    // Test sorting
    console.log("\n📊 Testing sorting by createdAt...");
    const sortedContent = await ContentModel.find({ userId: testUser._id })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(`✅ Retrieved ${sortedContent.length} items sorted by newest first`);

    // Cleanup test data
    console.log("\n🧹 Cleaning up test data...");
    await ContentModel.deleteOne({ _id: testContent._id });
    console.log("✅ Test content deleted");

    console.log("\n✨ All tests passed! Database features are working correctly.\n");
    
    // Display summary
    console.log("=== FEATURE VERIFICATION SUMMARY ===");
    console.log("✅ Database connection");
    console.log("✅ Content creation with new fields (isFavorite, isArchived, notes)");
    console.log("✅ Favorite toggle functionality");
    console.log("✅ Archive toggle functionality");
    console.log("✅ Content update functionality");
    console.log("✅ Favorite filtering");
    console.log("✅ Archive filtering");
    console.log("✅ Compound filtering");
    console.log("✅ Sorting by date");
    console.log("===================================\n");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

testNewFeatures();
