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
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"),
  password: z.string().min(1),
});

// @ts-ignore - Express v5 async handler types are compatible at runtime
router.post("/signup", async (req, res) => {
  
  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ message: "Invalid input", errors: parseResult.error.issues });
  }
  
  const { username, email, password } = parseResult.data;

  try {
    // Hash password with 12 rounds (OWASP recommendation 2025)
    const hashedPassword = await bcrypt.hash(password, 12);


    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword, 
    });
    const token = jwt.sign({ id: user._id.toString() }, JWT_PASS as string, { expiresIn: '1d' });

    return res.status(201).json({ message: "User created successfully", token });

  } catch (error: any) {
    // Handle duplicate key error (MongoDB unique index violation)
    if (error.code === 11000) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }
    // Don't log sensitive data
    console.error("Signup Error:", { message: error.message });
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

// @ts-ignore - Express v5 async handler types are compatible at runtime
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


    // Compare password with stored hash
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

    const token = jwt.sign({ id: user._id.toString() }, JWT_PASS as string, { expiresIn: '1d' }); 

    return res.json({ token });

  } catch (error: any) {
    // Don't log sensitive data (passwords, tokens)
    console.error("Login Error:", { message: error.message });
    return res.status(500).json({ message: "An internal server error occurred" });
  }
});

export default router;
