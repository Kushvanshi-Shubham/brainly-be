import { Router, Request } from "express";
import { asyncHandler } from "../asyncHandler";
import { userMiddleware } from "../middleware";
import { CollectionModel, ContentModel } from "../db";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Validation schemas
const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color").optional(),
  icon: z.string().optional(),
  isPrivate: z.boolean().optional()
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  isPrivate: z.boolean().optional(),
  order: z.number().optional()
});

const addContentSchema = z.object({
  contentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid content ID")
});

// Get all collections for a user
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;

  const collections = await CollectionModel.find({ userId })
    .sort({ order: 1, createdAt: -1 })
    .populate({
      path: 'contentIds',
      select: 'title link type tags createdAt',
      options: { limit: 5 } // Preview first 5 items
    });

  res.json({
    collections: collections.map(col => ({
      id: col._id,
      name: col.name,
      description: col.description,
      color: col.color,
      icon: col.icon,
      contentCount: col.contentIds.length,
      contentPreview: col.contentIds,
      isPrivate: col.isPrivate,
      order: col.order,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt
    }))
  });
}));

// Get a single collection with all content
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/:collectionId", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { collectionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(collectionId)) {
    res.status(400).json({ error: "Invalid collection ID" });
    return;
  }

  const collection = await CollectionModel.findOne({
    _id: collectionId,
    userId
  }).populate({
    path: 'contentIds',
    populate: {
      path: 'tags',
      select: 'name'
    }
  });

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.json({
    id: collection._id,
    name: collection.name,
    description: collection.description,
    color: collection.color,
    icon: collection.icon,
    content: collection.contentIds,
    isPrivate: collection.isPrivate,
    order: collection.order,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt
  });
}));

// Create a new collection
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.post("/", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const validation = createCollectionSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.issues[0].message });
    return;
  }

  const { name, description, color, icon, isPrivate } = validation.data;

  // Get the current max order for user's collections
  const maxOrder = await CollectionModel.findOne({ userId })
    .sort({ order: -1 })
    .select('order');

  const collection = await CollectionModel.create({
    name,
    description: description || "",
    color: color || "#8B5CF6",
    icon: icon || "📁",
    userId,
    isPrivate: isPrivate || false,
    order: maxOrder ? maxOrder.order + 1 : 0,
    contentIds: []
  });

  res.status(201).json({
    id: collection._id,
    name: collection.name,
    description: collection.description,
    color: collection.color,
    icon: collection.icon,
    contentCount: 0,
    isPrivate: collection.isPrivate,
    order: collection.order,
    createdAt: collection.createdAt
  });
}));

// Update a collection
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.put("/:collectionId", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { collectionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(collectionId)) {
    res.status(400).json({ error: "Invalid collection ID" });
    return;
  }

  const validation = updateCollectionSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.issues[0].message });
    return;
  }

  const collection = await CollectionModel.findOneAndUpdate(
    { _id: collectionId, userId },
    { $set: validation.data },
    { new: true, runValidators: true }
  );

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.json({
    id: collection._id,
    name: collection.name,
    description: collection.description,
    color: collection.color,
    icon: collection.icon,
    contentCount: collection.contentIds.length,
    isPrivate: collection.isPrivate,
    order: collection.order,
    updatedAt: collection.updatedAt
  });
}));

// Delete a collection
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.delete("/:collectionId", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { collectionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(collectionId)) {
    res.status(400).json({ error: "Invalid collection ID" });
    return;
  }

  const collection = await CollectionModel.findOneAndDelete({
    _id: collectionId,
    userId
  });

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.json({ message: "Collection deleted successfully" });
}));

// Add content to collection
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.post("/:collectionId/content", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { collectionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(collectionId)) {
    res.status(400).json({ error: "Invalid collection ID" });
    return;
  }

  const validation = addContentSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.issues[0].message });
    return;
  }

  const { contentId } = validation.data;

  // Verify content exists and belongs to user
  const content = await ContentModel.findOne({ _id: contentId, userId });
  if (!content) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  // Add content to collection if not already present
  const collection = await CollectionModel.findOneAndUpdate(
    { _id: collectionId, userId },
    { $addToSet: { contentIds: contentId } },
    { new: true }
  );

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.json({
    message: "Content added to collection",
    contentCount: collection.contentIds.length
  });
}));

// Remove content from collection
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.delete("/:collectionId/content/:contentId", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { collectionId, contentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(collectionId) || !mongoose.Types.ObjectId.isValid(contentId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const collection = await CollectionModel.findOneAndUpdate(
    { _id: collectionId, userId },
    { $pull: { contentIds: contentId } },
    { new: true }
  );

  if (!collection) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.json({
    message: "Content removed from collection",
    contentCount: collection.contentIds.length
  });
}));

// Reorder collections
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.put("/reorder", userMiddleware, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.userId;
  const { collectionIds } = req.body as { collectionIds: string[] };

  if (!Array.isArray(collectionIds)) {
    res.status(400).json({ error: "collectionIds must be an array" });
    return;
  }

  // Update order for each collection
  const updates = collectionIds.map((id, index) => 
    CollectionModel.updateOne(
      { _id: id, userId },
      { $set: { order: index } }
    )
  );

  await Promise.all(updates);

  res.json({ message: "Collections reordered successfully" });
}));

export default router;
