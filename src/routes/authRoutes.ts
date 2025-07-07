import express from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../db";
import { JWT_PASS } from "../config";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    await UserModel.create({ username, password });
    res.json({ message: "User Signed up" });
  } catch (e) {
    res.status(411).json({ message: "Username Already Exists" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await UserModel.findOne({ username, password });
  if (existingUser) {
    const token = jwt.sign({ id: existingUser._id }, JWT_PASS);
    res.json({ token });
  } else {
    res.status(403).json({ message: "Incorrect data" });
  }
});

export default router;