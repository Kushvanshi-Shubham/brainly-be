import express from "express";
import { UserModel, ContentModel } from "../db";
import { userMiddleware } from "../middleware";

const router = express.Router();

// @ts-ignore
router.get("/profile", userMiddleware, async (req: any, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const contentCount = await ContentModel.countDocuments({ userId: req.userId });

    res.json({
      username: user.username,
      createdAt: user.createdAt,
      contentCount,
      
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});




export default router;
