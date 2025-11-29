import { Router, Request, Response } from "express";
import { ContentModel, UserModel } from "../db";
import { userMiddleware } from "../middleware";

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Get social feed - content from followed users
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/feed", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Get list of users the current user follows
    const currentUser = await UserModel.findById(userId).select("following");
    
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const followingIds = currentUser.following || [];

    // If not following anyone, return empty feed
    if (followingIds.length === 0) {
      res.json({
        content: [],
        message: "Follow users to see their content in your feed",
        stats: {
          totalItems: 0,
          followingCount: 0
        }
      });
      return;
    }

    // Get pagination parameters
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Fetch content from followed users with aggregation
    const content = await ContentModel.aggregate([
      {
        $match: {
          userId: { $in: followingIds }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $project: {
          _id: 1,
          link: 1,
          title: 1,
          type: 1,
          tags: 1,
          createdAt: 1,
          "userDetails._id": 1,
          "userDetails.username": 1,
          "userDetails.email": 1,
          "userDetails.profilePic": 1
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    // Get total count for pagination
    const totalCount = await ContentModel.countDocuments({
      userId: { $in: followingIds }
    });

    res.json({
      content,
      stats: {
        totalItems: totalCount,
        followingCount: followingIds.length,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + content.length < totalCount
      }
    });

  } catch (error) {
    console.error("Social feed error:", error);
    res.status(500).json({ message: "Failed to fetch social feed" });
  }
});

// Get trending content from followed users (most recent in last 7 days)
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/trending", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const currentUser = await UserModel.findById(userId).select("following");
    
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const followingIds = currentUser.following || [];

    if (followingIds.length === 0) {
      res.json({ content: [] });
      return;
    }

    // Get content from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingContent = await ContentModel.aggregate([
      {
        $match: {
          userId: { $in: followingIds },
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $project: {
          _id: 1,
          link: 1,
          title: 1,
          type: 1,
          tags: 1,
          createdAt: 1,
          "userDetails._id": 1,
          "userDetails.username": 1,
          "userDetails.email": 1,
          "userDetails.profilePic": 1
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({ content: trendingContent });

  } catch (error) {
    console.error("Trending feed error:", error);
    res.status(500).json({ message: "Failed to fetch trending content" });
  }
});

// Get popular tags from followed users
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/tags", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const currentUser = await UserModel.findById(userId).select("following");
    
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const followingIds = currentUser.following || [];

    if (followingIds.length === 0) {
      res.json({ tags: [] });
      return;
    }

    // Aggregate tags from followed users' content
    const tagStats = await ContentModel.aggregate([
      {
        $match: {
          userId: { $in: followingIds }
        }
      },
      {
        $unwind: "$tags"
      },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({ tags: tagStats });

  } catch (error) {
    console.error("Tags error:", error);
    res.status(500).json({ message: "Failed to fetch tags" });
  }
});

export default router;
