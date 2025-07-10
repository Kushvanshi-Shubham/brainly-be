import { NextFunction, Response, Request } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASS } from "./config";

export const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
 
  const authHeader = req.headers["authorization"];


  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: "Authorization token is missing or malformed",
    });
  }


  const token = authHeader.split(' ')[1];

  try {
// @ts-ignore
    const decodedPayload = jwt.verify(token, JWT_PASS);

    
    if (typeof decodedPayload === "string" || !decodedPayload.id) {
       return res.status(401).json({ message: "Invalid token payload" });
    }


    req.userId = decodedPayload.id;
    next(); 
  } catch (error) {
   
    return res.status(401).json({
      message: "Your session is not valid. Please log in again.",
    });
  }
};
