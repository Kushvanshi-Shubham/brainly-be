import { Router, Request, Response } from "express";
import { UserModel } from "../db";
import { userMiddleware } from "../middleware";

const router = Router();

// Discover users - get suggested users to follow
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/discover", userMiddleware, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId;
    const limit = Number.parseInt(req.query.limit as string) || 20;

    // Get current user's following list
    const currentUser = await UserModel.findById(currentUserId).select("following");
    const followingIds = currentUser?.following || [];

    // Find users that current user is NOT following (excluding self)
    const suggestedUsers = await UserModel.aggregate([
      {
        $match: {
          _id: {
            $ne: currentUserId,
            $nin: followingIds
          }
        }
      },
      {
        $addFields: {
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } }
        }
      },
      {
        $lookup: {
          from: "contents",
          localField: "_id",
          foreignField: "userId",
          as: "contents"
        }
      },
      {
        $addFields: {
          contentCount: { $size: "$contents" }
        }
      },
      // Sort by followers count (most popular first)
      { $sort: { followersCount: -1, contentCount: -1 } },
      { $limit: limit },
      {
        $project: {
          username: 1,
          email: 1,
          profilePic: 1,
          bio: 1,
          followersCount: 1,
          followingCount: 1,
          contentCount: 1,
          createdAt: 1
        }
      }
    ]);

    res.status(200).json({
      users: suggestedUsers,
      count: suggestedUsers.length
    });
  } catch (error) {
    console.error("Discover users error:", error);
    res.status(500).json({ message: "Failed to fetch suggested users" });
  }
});

// Search users by username or email
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/search", userMiddleware, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== "string") {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    const searchRegex = new RegExp(q, "i"); // Case-insensitive search

    const users = await UserModel.aggregate([
      {
        $match: {
          $or: [
            { username: searchRegex },
            { email: searchRegex }
          ]
        }
      },
      {
        $addFields: {
          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingCount: { $size: { $ifNull: ["$following", []] } }
        }
      },
      {
        $lookup: {
          from: "contents",
          localField: "_id",
          foreignField: "userId",
          as: "contents"
        }
      },
      {
        $addFields: {
          contentCount: { $size: "$contents" }
        }
      },
      { $limit: 50 },
      {
        $project: {
          username: 1,
          email: 1,
          profilePic: 1,
          bio: 1,
          followersCount: 1,
          followingCount: 1,
          contentCount: 1,
          createdAt: 1
        }
      }
    ]);

    res.status(200).json({
      users,
      count: users.length,
      query: q
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
});

export default router;
