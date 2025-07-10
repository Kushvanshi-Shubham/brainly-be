import express, { Request } from "express";
import { z } from "zod";
import { ContentModel, TagModel } from "../db";
import { userMiddleware } from "../middleware";
import mongoose from "mongoose";

const router = express.Router();


interface AuthenticatedRequest extends Request {
  userId?: string;
}


// @ts-ignore
const contentSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  link: z.string().url("Must be a valid URL"),
  
  type: z.enum(['article', 'video', 'resource', 'other', 'youtube', 'twitter']),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
});

// @ts-ignore
router.post("/content", userMiddleware, async (req: AuthenticatedRequest, res) => {
  const parseResult = contentSchema.safeParse(req.body);
  if (!parseResult.success) {
 
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.flatten().fieldErrors });
  }

  const { title, link, type, tags = [] } = parseResult.data;

  try {
    const tagIds = await Promise.all(
      tags.map(async (tagName) => {
        const tag = await TagModel.findOneAndUpdate(
          { name: tagName },
          { $setOnInsert: { name: tagName } },
          { upsert: true, new: true }
        );
        return tag._id;
      })
    );

    const newContent = await ContentModel.create({
      title,
      link,
      type,
      userId: req.userId,
      tags: tagIds,
    });

    res.status(201).json({ message: "Content added successfully", content: newContent });

  } catch (error) {
    console.error("Add Content Error:", error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});


// @ts-ignore
router.get("/content", userMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const content = await ContentModel.find({ userId: req.userId })
      .populate("userId", "username")
      .populate("tags", "name")
      .sort({ createdAt: -1 });

    res.json({ content });
  } catch (error) {
    console.error("Get Content Error:", error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});


// @ts-ignore
router.delete("/content/:id", userMiddleware, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid content ID format" });
  }

  try {
    const result = await ContentModel.deleteOne({
      _id: id,
      userId: req.userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Content not found or you do not have permission to delete it" });
    }

    res.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error("Delete Content Error:", error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});


export default router;
