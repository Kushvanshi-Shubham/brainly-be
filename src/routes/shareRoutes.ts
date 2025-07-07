import express from "express";
import { ContentModel, LinkModel, UserModel } from "../db";
import { random } from "../utlis";
import { userMiddleware } from "../middleware";

const router = express.Router();

// @ts-ignore
router.post("/brain/share", userMiddleware, async (req, res) => {
  const { share } = req.body;
  if (share) {
    const existingLink = await LinkModel.findOne({ userId: req.userId });
    if (existingLink) return res.json({ hash: existingLink.hash });

    const hash = random(10);
    await LinkModel.create({ userId: req.userId, hash });
    return res.json({ hash });
  } else {
    await LinkModel.deleteOne({ userId: req.userId });
    res.json({ message: "Removed link" });
  }
});


//@ts-ignore
router.get("/brain/:shareLink", async (req, res) => {
  const { shareLink } = req.params;
  const link = await LinkModel.findOne({ hash: shareLink });
  if (!link) return res.status(411).json({ message: "Sorry incorrect input" });

  const content = await ContentModel.find({ userId: link.userId });
  const user = await UserModel.findById(link.userId);

  if (!user) return res.status(411).json({ message: "User not found" });

  res.json({ username: user.username, content });
});

export default router;