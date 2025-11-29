import { Router } from "express";
import { userMiddleware } from "../middleware";
import { NotificationModel } from "../db";

const router = Router();

// Get user's notifications
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/", userMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const notifications = await NotificationModel
      .find({ userId })
      .populate('actorId', 'username profilePic')
      .populate('contentId', 'title type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await NotificationModel.countDocuments({ userId });
    const unreadCount = await NotificationModel.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
});

// Get unread count
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.get("/unread-count", userMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const unreadCount = await NotificationModel.countDocuments({
      userId,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count"
    });
  }
});

// Mark notification as read
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.put("/:notificationId/read", userMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
});

// Mark all notifications as read
// @ts-ignore - Express v5 middleware types work correctly at runtime

router.put("/read-all", userMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    await NotificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read"
    });
  }
});

// Delete notification
// @ts-ignore - Express v5 middleware types work correctly at runtime
router.delete("/:notificationId", userMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification"
    });
  }
});

export default router;
