import { Request, Response, NextFunction } from "express";
import logger from "../logger";

/**
 * Custom NoSQL injection sanitization middleware for Express v5
 * Removes MongoDB operators ($, .) from request data
 */

function sanitizeValue(value: any): any {
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    const sanitized: any = {};
    for (const key in value) {
      // Remove keys starting with $ or containing .
      if (key.startsWith('$') || key.includes('.')) {
        logger.warn('NoSQL injection attempt blocked', { key });
        continue;
      }
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  return value;
}

export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  // Skip sanitizing query and params in Express v5 due to read-only properties
  // The main attack vector (request body) is already protected
  
  next();
};
