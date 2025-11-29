import express, { Request, Response } from "express";
import { ContentModel, TagModel } from "../db";
import { userMiddleware } from "../middleware";
import { Types } from "mongoose";

interface SearchQuery {
  userId: Types.ObjectId;
  title?: { $regex: string; $options: string };
  type?: string | { $in: string[] };
  tags?: { $in: Types.ObjectId[] } | { $size: number } | Types.ObjectId[];
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

interface SortOption {
  [key: string]: 1 | -1;
}

const router = express.Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Advanced search with multiple filters
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/search", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { 
      query,        // Text search in title
      type,         // Filter by content type
      tags,         // Filter by tags (comma-separated)
      dateFrom,     // Filter by date range
      dateTo,
      sortBy,       // Sort: 'newest', 'oldest', 'title'
      page = 1,
      limit = 20
    } = req.query;

    // Build MongoDB query with proper typing
    const searchQuery: SearchQuery = { userId: new Types.ObjectId(userId) };

    // Text search in title
    if (query && typeof query === 'string') {
      searchQuery.title = { $regex: query, $options: 'i' };
    }

    // Filter by type
    if (type && typeof type === 'string') {
      searchQuery.type = type;
    }

    // Filter by tags
    if (tags && typeof tags === 'string') {
      const tagNames = tags.split(',').map(t => t.trim().toLowerCase());
      const tagDocs = await TagModel.find({ name: { $in: tagNames } });
      const tagIds = tagDocs.map(tag => tag._id);
      
      if (tagIds.length > 0) {
        searchQuery.tags = { $in: tagIds };
      }
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      searchQuery.createdAt = {};
      if (dateFrom && typeof dateFrom === 'string') {
        searchQuery.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        searchQuery.createdAt.$lte = new Date(dateTo);
      }
    }

    // Determine sort order with proper typing
    let sortOption: SortOption = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sortBy === 'title') {
      sortOption = { title: 1 };
    }

    // Pagination
    const pageNum = Number.parseInt(page as string);
    const limitNum = Number.parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [results, total] = await Promise.all([
      ContentModel.find(searchQuery)
        .populate("userId", "username profilePic")
        .populate("tags", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      ContentModel.countDocuments(searchQuery)
    ]);

    return res.json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        query,
        type,
        tags,
        dateFrom,
        dateTo,
        sortBy
      }
    });
  } catch (error) {
    console.error("Advanced Search Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Get available filter options (types and tags)
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/search/filters", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Get all unique types for this user
    const types = await ContentModel.distinct('type', { userId });

    // Get all tags used by this user
    const userContent = await ContentModel.find({ userId }).distinct('tags');
    const tags = await TagModel.find({ _id: { $in: userContent } }).select('name');

    return res.json({
      types,
      tags: tags.map(tag => tag.name)
    });
  } catch (error) {
    console.error("Get Filters Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Quick filters - predefined common searches
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/search/quick/:filter", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { filter } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Number.parseInt(page as string);
    const limitNum = Number.parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let searchQuery: SearchQuery = { userId: new Types.ObjectId(userId) };
    let sortOption: SortOption = { createdAt: -1 };

    switch (filter) {
      case 'recent':
        // Last 7 days
        searchQuery.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'videos':
        searchQuery.type = { $in: ['youtube', 'video'] };
        break;
      case 'articles':
        searchQuery.type = 'article';
        break;
      case 'social':
        searchQuery.type = 'twitter';
        break;
      case 'untagged':
        searchQuery.tags = { $size: 0 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      default:
        return res.status(400).json({ message: "Invalid quick filter" });
    }

    const [results, total] = await Promise.all([
      ContentModel.find(searchQuery)
        .populate("userId", "username profilePic")
        .populate("tags", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      ContentModel.countDocuments(searchQuery)
    ]);

    return res.json({
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filter
    });
  } catch (error) {
    console.error("Quick Filter Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
