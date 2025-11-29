import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { connectDB } from "./db";
import { sanitizeMiddleware } from "./middleware/sanitize"; 
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import shareRoutes from "./routes/shareRoutes";
import profileRoutes from "./routes/profileRoutes";
import discoveryRoutes from "./routes/discoveryRoutes";
import searchRoutes from "./routes/searchRoutes";
import followRoutes from "./routes/followRoutes";
import discoveryUsersRoutes from "./routes/discoveryUsersRoutes";
import socialFeedRoutes from "./routes/socialFeedRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import collectionRoutes from "./routes/collectionRoutes";
import linkPreviewRoutes from "./routes/linkPreviewRoutes";
import { errorHandler, notFoundHandler } from "./errorHandler";
import { PORT, FRONTEND_URL, NODE_ENV } from "./config";
import logger from "./logger";


const startServer = async () => {
  try {
  
    await connectDB();

    const app = express();
    
    // Security middleware with relaxed CSP for embed support
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Twitter/Instagram embeds
            "https://platform.twitter.com",
            "https://www.instagram.com",
            "https://connect.facebook.net"
          ],
          frameSrc: [
            "'self'",
            "https://www.youtube.com",
            "https://platform.twitter.com",
            "https://www.instagram.com",
            "https://open.spotify.com",
            "https://player.vimeo.com",
            "https://www.tiktok.com",
            "https://codepen.io",
            "https://w.soundcloud.com",
            "https://player.twitch.tv"
          ],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }));
    
    // Rate limiting - generous limits for development
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Increased for development - React StrictMode doubles requests
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting in development for localhost
        const isDev = NODE_ENV === 'development';
        const isLocalhost = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
        return isDev && isLocalhost;
      }
    });
    
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50, // Increased for development
      message: "Too many authentication attempts, please try again later.",
      skip: (req) => NODE_ENV === 'development'
    });
    
    app.use("/api/v1", limiter);
    
    // CORS configuration - allow local development and production
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost on any port
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        
        // Allow production domains
        const allowedDomains = [
          FRONTEND_URL,
          "https://brainly-fe-coral.vercel.app",
        ];
        
        if (allowedDomains.includes(origin)) {
          return callback(null, true);
        }
        
        // In development, allow all origins
        if (NODE_ENV === 'development') {
          logger.warn('CORS allowing origin in dev mode', { origin });
          return callback(null, true);
        }
        
        logger.warn('CORS blocked origin', { origin });
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 600,
      preflightContinue: false,
      optionsSuccessStatus: 204
    }));
    
    app.use(express.json());
    
    // Request timeout middleware - prevent hanging requests
    app.use((req, res, next) => {
      req.setTimeout(30000); // 30 second timeout
      res.setTimeout(30000);
      next();
    });
    
    // Custom NoSQL injection protection (Express v5 compatible)
    app.use(sanitizeMiddleware);
 
    app.get("/health", (req, res) => {
        const dbState = mongoose.connection.readyState;
        
        // Map database state to readable status
        let dbStatus = 'disconnected';
        if (dbState === 1) dbStatus = 'connected';
        else if (dbState === 2) dbStatus = 'connecting';
        
        const isHealthy = dbState === 1;
        
        res.status(isHealthy ? 200 : 503).json({ 
          status: isHealthy ? "UP" : "DOWN",
          database: dbStatus,
          timestamp: new Date().toISOString()
        });
    });

    // Apply stricter rate limiting to auth routes
    app.use("/api/v1/signup", authLimiter);
    app.use("/api/v1/login", authLimiter);

    app.use("/api/v1", authRoutes);
    app.use("/api/v1", contentRoutes);
    app.use("/api/v1", shareRoutes);
    app.use("/api/v1", profileRoutes);
    app.use("/api/v1", discoveryRoutes);
    app.use("/api/v1", searchRoutes);
    app.use("/api/v1", followRoutes);
    app.use("/api/v1/users", discoveryUsersRoutes);
    app.use("/api/v1/social", socialFeedRoutes);
    app.use("/api/v1/notifications", notificationRoutes);
    app.use("/api/v1/collections", collectionRoutes);
    app.use("/api/v1/link-preview", linkPreviewRoutes);

    // Handle 404 errors
    app.use(notFoundHandler);

    // Global error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${NODE_ENV} mode and connected to MongoDB.`);
    });

  } catch (error: any) {
    logger.error("Failed to start the server", { message: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || String(reason) });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
