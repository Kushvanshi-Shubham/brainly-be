import express, { Request, Response } from "express";
import { z } from "zod";
import { ContentModel, LinkModel, UserModel } from "../db";
import { random } from "../utlis"; // Assuming this function exists and creates a random string
import { userMiddleware } from "../middleware";

const router = express.Router();


const shareToggleSchema = z.object({
  share: z.boolean(),
});

// @ts-expect-error - Express v5 middleware types work correctly at runtime
router.post("/brain/share", userMiddleware, async (req, res) => {
  const parseResult = shareToggleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.issues });
  }

  const { share } = parseResult.data;
  const { userId } = req;

  try {
    if (share) {

      const existingLink = await LinkModel.findOne({ userId });
      if (existingLink) {
        return res.json({ hash: existingLink.hash });
      }


      let hash: string | undefined;
      let isUnique = false;
      while (!isUnique) {
        hash = random(10); 
        const collisionCheck = await LinkModel.findOne({ hash });
        if (!collisionCheck) {
          isUnique = true; 
        }
      }

      await LinkModel.create({ userId, hash });
      return res.status(201).json({ hash });

    } else {
      
      await LinkModel.deleteOne({ userId });
      return res.json({ message: "Sharing link has been removed" });
    }
  } catch (error) {
    console.error("Share Link Toggle Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// @ts-expect-error - Express v5 route handler types work correctly at runtime
router.get("/brain/:shareLink", async (req: Request, res: Response) => {
  const { shareLink } = req.params;

  try {
    
    const link = await LinkModel.findOne({ hash: shareLink });
    if (!link) {

      return res.status(404).json({ message: "This share link is invalid or has expired" });
    }


    const [user, content] = await Promise.all([
      UserModel.findById(link.userId).select('username'), 
      ContentModel.find({ userId: link.userId })
        .populate("tags", "name") 
        .sort({ createdAt: -1 }), 
    ]);


    if (!user) {
      return res.status(404).json({ message: "The owner of this content no longer exists" });
    }


    res.json({
      username: user.username,
      content,
    });

  } catch (error) {
    console.error("Get Shared Content Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
