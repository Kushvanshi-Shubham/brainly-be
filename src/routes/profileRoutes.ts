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

   
    const [user, contentCount] = await Promise.all([
   
      UserModel.findById(userId).select('-password'),
  
      ContentModel.countDocuments({ userId: userId })
    ]);

    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    res.json({
      username: user.username,
      joinedAt: user.createdAt, 
      contentCount,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
