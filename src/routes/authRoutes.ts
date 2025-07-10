import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; 
import { z } from "zod"; 
import { UserModel } from "../db";
import { JWT_PASS } from "../config";

const router = express.Router();

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long").email("Must be a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});


// @ts-ignore
router.post("/signup", async (req, res) => {
  
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {

    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.flatten().fieldErrors });
  }
  
  const { username, password } = parseResult.data;

  try {

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {

      return res.status(409).json({ message: "A user with this email already exists" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await UserModel.create({
      username,
      password: hashedPassword, 
    });
//@ts-ignore
    const token = jwt.sign({ id: user._id }, JWT_PASS, { expiresIn: '1d' });


    res.status(201).json({ message: "User created successfully", token });

  } catch (error) {
    console.error("Signup Error:", error); 
    res.status(500).json({ message: "An internal server error occurred" });
  }
});


// @ts-ignore
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    
    const user = await UserModel.findOne({ username });
    if (!user) {

      return res.status(401).json({ message: "Invalid email or password" });
    }


    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {

      return res.status(401).json({ message: "Invalid email or password" });
    }

//@ts-ignore
    const token = jwt.sign({ id: user._id }, JWT_PASS, { expiresIn: '1d' }); 

    res.json({ token });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
