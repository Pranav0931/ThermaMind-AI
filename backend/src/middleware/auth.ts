import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthenticatedRequest["user"];
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid bearer token" });
  }
}
