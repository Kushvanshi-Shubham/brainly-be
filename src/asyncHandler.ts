import { Request, Response, NextFunction } from "express";
import logger from "./logger";

/**
 * Async handler wrapper to catch errors in async route handlers
 * Prevents unhandled promise rejections from crashing the server
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async route error', {
        path: req.path,
        method: req.method,
        message: error.message,
        stack: error.stack
      });
      
      // Only send response if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({
          message: "An internal server error occurred",
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  };
};
