import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; 
import { z } from "zod"; 
import { UserModel } from "../db";
import { JWT_PASS } from "../config";

if (!JWT_PASS) {
  throw new Error("JWT_PASS is not defined");
}

const router = express.Router();

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1),
});

// @ts-ignore - Express v5 type inference works correctly at runtime
router.post("/signup", async (req, res) => {
  
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.issues });
  }
  
  const { username, email, password } = parseResult.data;

  try {

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {

      return res.status(409).json({ message: "A user with this email already exists" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword, 
    });
    const token = jwt.sign({ id: user._id.toString() }, JWT_PASS as string, { expiresIn: '1d' });

    return res.status(201).json({ message: "User created successfully", token });

  } catch (error) {
    console.error("Signup Error:", error); 
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// @ts-ignore - Express v5 type inference works correctly at runtime
router.post("/login", async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.issues });
  }

  const { usernameOrEmail, password } = parseResult.data;

  try {
    // Find user by email OR username
    const user = await UserModel.findOne({
      $or: [
        { email: usernameOrEmail },
        { username: usernameOrEmail }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }


    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

    const token = jwt.sign({ id: user._id.toString() }, JWT_PASS as string, { expiresIn: '1d' }); 

    return res.json({ token });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
