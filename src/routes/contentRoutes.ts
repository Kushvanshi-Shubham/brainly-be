import express from "express";
import { ContentModel } from "../db";
import { userMiddleware } from "../middleware";

const router = express.Router();

router.post("/content", userMiddleware, async (req, res) => {
  const { link, type, title } = req.body;
  await ContentModel.create({ link, type, title, userId: req.userId, tags: [] });
  res.json({ message: "Content added" });
});

router.get("/content", userMiddleware, async (req, res) => {
  const content = await ContentModel.find({ userId: req.userId }).populate("userId", "username");
  res.json({ content });
});

//@ts-ignore
router.delete("/content/:id", userMiddleware, async (req, res) => {
  console.log("Delete req for:", req.params.id, "by user", req.userId);
  const deleted = await ContentModel.deleteOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!deleted.deletedCount) {
    return res.status(403).json({ message: "Unauthorized or content not found" });
  }

  res.json({ message: "Deleted" });
});


export default router;