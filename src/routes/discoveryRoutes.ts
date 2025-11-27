import express, { Request, Response } from "express";
import { ContentModel } from "../db";
import { userMiddleware } from "../middleware";

const router = express.Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Get discovery feed with analytics
// @ts-expect-error - Express v5 middleware types work correctly at runtime
router.get("/discovery/feed", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Content saved this week
    const thisWeek = await ContentModel.find({
      userId,
      createdAt: { $gte: weekAgo }
    })
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Content saved this month (excluding this week)
    const thisMonth = await ContentModel.find({
      userId,
      createdAt: { $gte: monthAgo, $lt: weekAgo }
    })
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    // Content type breakdown
    const typeBreakdown = await ContentModel.aggregate([
      { $match: { userId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Most used tags
    const tagStats = await ContentModel.aggregate([
      { $match: { userId } },
      { $unwind: "$tags" },
      {
        $lookup: {
          from: "tags",
          localField: "tags",
          foreignField: "_id",
          as: "tagInfo"
        }
      },
      { $unwind: "$tagInfo" },
      { $group: { _id: "$tagInfo.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Random item for rediscovery
    const totalCount = await ContentModel.countDocuments({ userId });
    const randomItem = totalCount > 0 
      ? await ContentModel.findOne({ userId })
          .skip(Math.floor(Math.random() * totalCount))
          .populate("tags", "name")
      : null;

    // "On this day" - content saved 1 year ago
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneDayBefore = new Date(oneYearAgo.getTime() - 24 * 60 * 60 * 1000);
    const oneDayAfter = new Date(oneYearAgo.getTime() + 24 * 60 * 60 * 1000);
    
    const onThisDay = await ContentModel.find({
      userId,
      createdAt: {
        $gte: oneDayBefore,
        $lte: oneDayAfter
      }
    }).populate("tags", "name");

    return res.json({
      thisWeek,
      thisMonth,
      typeBreakdown,
      tagStats,
      randomItem,
      onThisDay,
      stats: {
        totalItems: totalCount,
        savedThisWeek: thisWeek.length,
        savedThisMonth: thisMonth.length + thisWeek.length
      }
    });
  } catch (error) {
    console.error("Discovery Feed Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Get timeline view (grouped by date)
// @ts-expect-error - Express v5 middleware types work correctly at runtime
router.get("/discovery/timeline", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    const timeline = await ContentModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 },
          items: { $push: "$$ROOT" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 30 }
    ]);

    return res.json({ timeline });
  } catch (error) {
    console.error("Timeline Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// Get insights and statistics
// @ts-expect-error - Express v5 middleware types work correctly at runtime
router.get("/discovery/insights", userMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Saving trend over last 30 days
    const savingTrend = await ContentModel.aggregate([
      { $match: { userId, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    // Most saved domains (extract from URLs)
    const domainStats = await ContentModel.aggregate([
      { $match: { userId } },
      {
        $project: {
          domain: {
            $arrayElemAt: [
              { $split: [{ $arrayElemAt: [{ $split: ["$link", "://"] }, 1] }, "/"] },
              0
            ]
          }
        }
      },
      { $group: { _id: "$domain", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return res.json({
      savingTrend,
      domainStats,
      generatedAt: now
    });
  } catch (error) {
    console.error("Insights Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
