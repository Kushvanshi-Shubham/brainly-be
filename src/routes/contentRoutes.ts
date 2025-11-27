import express, { Request } from "express";
import { z } from "zod";
import { ContentModel, TagModel } from "../db";
import { userMiddleware } from "../middleware";
import mongoose from "mongoose";

const router = express.Router();


interface AuthenticatedRequest extends Request {
  userId?: string;
}

const contentSchema = z.object({
  title: z.string().min(1),
  link: z.string().url({ message: "Invalid URL format" }),
  type: z.enum(['article', 'video', 'resource', 'other', 'youtube', 'twitter']),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
});

// @ts-expect-error - Express v5 middleware types work correctly at runtime
router.post("/content", userMiddleware, async (req: AuthenticatedRequest, res) => {
  const parseResult = contentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.issues });
  }

  const { title, link, type, tags = [] } = parseResult.data;

  try {
    const tagIds = await Promise.all(
      tags.map(async (tagName: string) => {
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

    return res.status(201).json({ message: "Content added successfully", content: newContent });

  } catch (error) {
    console.error("Add Content Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// @ts-expect-error - Express v5 middleware types work correctly at runtime
router.get("/content", userMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    // Pagination parameters
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const total = await ContentModel.countDocuments({ userId: req.userId });

    const content = await ContentModel.find({ userId: req.userId })
      .populate("userId", "username profilePic")
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Optimize: return plain JavaScript objects

    return res.json({
      content,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Content Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// @ts-expect-error - Express v5 middleware types work correctly at runtime
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

    return res.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error("Delete Content Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});


export default router;
