import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import shareRoutes from "./routes/shareRoutes";
import profileRoutes from "./routes/profileRoutes"; 

const app = express();
app.use(cors({
  origin: "https://brainly-fe-azb4.vercel.app",
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/v1", authRoutes);
app.use("/api/v1", contentRoutes);
app.use("/api/v1", shareRoutes);
app.use("/api/v1", profileRoutes);




app.listen(3000, () => console.log("Server running on port 3000"));
