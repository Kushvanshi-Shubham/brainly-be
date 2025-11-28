import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./db"; 
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import shareRoutes from "./routes/shareRoutes";
import profileRoutes from "./routes/profileRoutes";
import discoveryRoutes from "./routes/discoveryRoutes";
import searchRoutes from "./routes/searchRoutes";
import { errorHandler, notFoundHandler } from "./errorHandler";
import { PORT, FRONTEND_URL, NODE_ENV } from "./config";


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
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5, // Limit auth attempts
      message: "Too many authentication attempts, please try again later.",
    });
    
    app.use("/api/v1", limiter);
    
    // CORS configuration - allow Vercel frontend
    const allowedOrigins = [
      FRONTEND_URL,
      "https://brainly-fe-coral.vercel.app",
      "http://localhost:5173", // Local development
    ];

    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));
    
    app.use(express.json());

 
    app.get("/health", (req, res) => {
        res.status(200).json({ status: "UP" });
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

    // Handle 404 errors
    app.use(notFoundHandler);

    // Global error handler
    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode and connected to MongoDB.`);
    });

  } catch (error) {

    console.error("Failed to start the server", error);
    process.exit(1);
  }
};


startServer();
