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
  type: z.enum(['article', 'video', 'resource', 'other', 'youtube', 'twitter', 'instagram', 'tiktok', 'linkedin', 'reddit', 'medium', 'github', 'codepen', 'spotify', 'soundcloud', 'vimeo', 'twitch', 'facebook', 'pinterest']),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
});

// @ts-ignore - Express v5 middleware types work correctly at runtime
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

// @ts-ignore - Express v5 middleware types work correctly at runtime
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

// @ts-ignore - Express v5 middleware types work correctly at runtime
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

// Update content (title, link, type, tags, notes)
const updateContentSchema = z.object({
  title: z.string().min(1).optional(),
  link: z.string().url({ message: "Invalid URL format" }).optional(),
  type: z.enum(['article', 'video', 'resource', 'other', 'youtube', 'twitter']).optional(),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
  notes: z.string().max(1000).optional(),
});

// @ts-ignore - Express v5 middleware types work correctly at runtime
router.put("/content/:id", userMiddleware, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid content ID format" });
  }

  const parseResult = updateContentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.issues });
  }

  try {
    const updateData: Record<string, unknown> = {};
    const { title, link, type, tags, notes } = parseResult.data;

    if (title !== undefined) updateData.title = title;
    if (link !== undefined) updateData.link = link;
    if (type !== undefined) updateData.type = type;
    if (notes !== undefined) updateData.notes = notes;

    // Handle tags separately
    if (tags !== undefined) {
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
      updateData.tags = tagIds;
    }

    const updatedContent = await ContentModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("tags", "name");

    if (!updatedContent) {
      return res.status(404).json({ message: "Content not found or you do not have permission to update it" });
    }

    return res.json({ message: "Content updated successfully", content: updatedContent });
  } catch (error) {
    console.error("Update Content Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Toggle favorite
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.patch("/content/:id/favorite", userMiddleware, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid content ID format" });
  }

  try {
    const content = await ContentModel.findOne({ _id: id, userId: req.userId });
    
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    content.isFavorite = !content.isFavorite;
    await content.save();

    return res.json({ 
      message: content.isFavorite ? "Added to favorites" : "Removed from favorites", 
      isFavorite: content.isFavorite 
    });
  } catch (error) {
    console.error("Toggle Favorite Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Toggle archive
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.patch("/content/:id/archive", userMiddleware, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid content ID format" });
  }

  try {
    const content = await ContentModel.findOne({ _id: id, userId: req.userId });
    
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    content.isArchived = !content.isArchived;
    await content.save();

    return res.json({ 
      message: content.isArchived ? "Archived" : "Unarchived", 
      isArchived: content.isArchived 
    });
  } catch (error) {
    console.error("Toggle Archive Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});


export default router;
