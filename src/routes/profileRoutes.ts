import express, { Request, Response } from "express";
import { UserModel, ContentModel } from "../db";
import { userMiddleware } from "../middleware";


interface AuthenticatedRequest extends Request {
  userId: string; 
}

const router = express.Router();

// @ts-ignore
router.get("/profile", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    
    const userId = req.userId;

   
    const [user, contentCount, typeBreakdown, recentContent, tagStats] = await Promise.all([
   
      UserModel.findById(userId).select('-password'),
  
      ContentModel.countDocuments({ userId: userId }),
      
      // Type breakdown
      ContentModel.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent activity (last 10 items)
      ContentModel.find({ userId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title type createdAt')
        .lean(),
      
      // Tag statistics
      ContentModel.aggregate([
        { $match: { userId: userId } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'tags', localField: '_id', foreignField: '_id', as: 'tagDetails' } },
        { $unwind: "$tagDetails" },
        { $project: { name: "$tagDetails.name", count: 1 } }
      ])
    ]);

    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate total unique tags
    const totalTags = tagStats.length;

    res.json({
      username: user.username,
      email: user.email,
      profilePic: user.profilePic || "",
      bio: user.bio || "",
      joinedAt: user.createdAt, 
      contentCount,
      typeBreakdown,
      recentActivity: recentContent,
      topTags: tagStats,
      totalTags
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});

// @ts-ignore
router.put("/profile", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { profilePic, bio } = req.body;

    const updateData: { profilePic?: string; bio?: string } = {};
    
    if (profilePic !== undefined) {
      updateData.profilePic = profilePic;
    }
    
    if (bio !== undefined) {
      updateData.bio = bio;
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      username: user.username,
      email: user.email,
      profilePic: user.profilePic || "",
      bio: user.bio || ""
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Get public user profile by userId
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/user/:userId", userMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [user, contentCount, typeBreakdown, recentContent, tagStats] = await Promise.all([
      UserModel.findById(userId).select('-password'),
      ContentModel.countDocuments({ userId: userId }),
      
      // Type breakdown
      ContentModel.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent public content (last 10 items)
      ContentModel.find({ userId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title type createdAt')
        .lean(),
      
      // Tag statistics
      ContentModel.aggregate([
        { $match: { userId: userId } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'tags', localField: '_id', foreignField: '_id', as: 'tagDetails' } },
        { $unwind: "$tagDetails" },
        { $project: { name: "$tagDetails.name", count: 1 } }
      ])
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const totalTags = tagStats.length;

    res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic || "",
      bio: user.bio || "",
      joinedAt: user.createdAt,
      contentCount,
      typeBreakdown,
      recentActivity: recentContent,
      topTags: tagStats,
      totalTags,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0
    });
  } catch (err) {
    console.error("Get User Profile Error:", err);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
