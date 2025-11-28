import { Router, Request, Response } from "express";
import { UserModel } from "../db";
import { authMiddleware } from "../middleware";

const router = Router();

// Follow a user
router.post("/follow/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    //@ts-expect-error - userId is set by authMiddleware
    const currentUserId = req.userId;

    // Can't follow yourself
    if (userId === currentUserId) {
      res.status(400).json({ message: "You cannot follow yourself" });
      return;
    }

    // Check if target user exists
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Check if already following
    const currentUser = await UserModel.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({ message: "Current user not found" });
      return;
    }

    if (currentUser.following?.includes(userId as any)) {
      res.status(400).json({ message: "Already following this user" });
      return;
    }

    // Add to following list of current user
    await UserModel.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: userId }
    });

    // Add to followers list of target user
    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { followers: currentUserId }
    });

    res.status(200).json({ 
      message: "Successfully followed user",
      userId: userId
    });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ message: "Failed to follow user" });
  }
});

// Unfollow a user
router.post("/unfollow/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    //@ts-expect-error - userId is set by authMiddleware
    const currentUserId = req.userId;

    // Can't unfollow yourself
    if (userId === currentUserId) {
      res.status(400).json({ message: "Invalid operation" });
      return;
    }

    // Remove from following list of current user
    await UserModel.findByIdAndUpdate(currentUserId, {
      $pull: { following: userId }
    });

    // Remove from followers list of target user
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { followers: currentUserId }
    });

    res.status(200).json({ 
      message: "Successfully unfollowed user",
      userId: userId
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ message: "Failed to unfollow user" });
  }
});

// Get followers list
router.get("/followers/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId)
      .populate("followers", "username email profilePic bio")
      .select("followers");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ 
      followers: user.followers || [],
      count: user.followers?.length || 0
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({ message: "Failed to fetch followers" });
  }
});

// Get following list
router.get("/following/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId)
      .populate("following", "username email profilePic bio")
      .select("following");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ 
      following: user.following || [],
      count: user.following?.length || 0
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({ message: "Failed to fetch following list" });
  }
});

// Check if current user is following target user
router.get("/is-following/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    //@ts-expect-error - userId is set by authMiddleware
    const currentUserId = req.userId;

    const currentUser = await UserModel.findById(currentUserId).select("following");
    
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isFollowing = currentUser.following?.includes(userId as any) || false;

    res.status(200).json({ isFollowing });
  } catch (error) {
    console.error("Check following status error:", error);
    res.status(500).json({ message: "Failed to check following status" });
  }
});

export default router;
