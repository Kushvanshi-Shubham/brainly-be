import express from "express";
import cors from "cors";
import { connectDB } from "./db"; 
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import shareRoutes from "./routes/shareRoutes";
import profileRoutes from "./routes/profileRoutes";


const startServer = async () => {
  try {
  
    await connectDB();

 
    const app = express();
    app.use(cors({
      origin: ["http://localhost:5173", "https://brainly-fe-azb4.vercel.app"],
      credentials: true,
    }));
    app.use(express.json());

 
    app.get("/health", (req, res) => {
        res.status(200).json({ status: "UP" });
    });

 
    app.use("/api/v1", authRoutes);
    app.use("/api/v1", contentRoutes);
    app.use("/api/v1", shareRoutes);
    app.use("/api/v1", profileRoutes);


    app.listen(3000, () => {
      console.log("Server is running on port 3000 and connected to MongoDB.");
    });

  } catch (error) {

    console.error("Failed to start the server", error);
    process.exit(1);
  }
};


startServer();
