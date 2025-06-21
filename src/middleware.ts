import { NextFunction, Response, Request } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_PASS } from "./config";

export const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers["authorization"];
  const decode = jwt.verify(header as string, JWT_PASS);

  if (decode) {
    if (typeof decode === "string") {
      res.status(403).json({
        message: "You are not logged in!",
      });
      return;
    }
    req.userId = (decode as JwtPayload).id;
    next();
  } else {
    res.status(403).json({
      message: "You are not logged in",
    });
  }
};
