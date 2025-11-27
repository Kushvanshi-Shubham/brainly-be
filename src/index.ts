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
    
    // Security middleware
    app.use(helmet());
    
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
    
    app.use(cors({
      origin: [FRONTEND_URL, "https://brainly-fe-coral.vercel.app"],
      credentials: true,
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
