import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError, isRecord } from "../utils/http";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string | number;
    email?: string;
    role?: string;
  };
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    return next(new AppError(401, "AUTH_REQUIRED", "Missing bearer token"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (!isRecord(payload) || payload.sub === undefined) {
      return next(new AppError(401, "AUTH_INVALID", "Invalid bearer token"));
    }

    req.user = {
      id: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };
    return next();
  } catch {
    return next(new AppError(401, "AUTH_INVALID", "Invalid bearer token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "AUTH_REQUIRED", "Authentication is required"));
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return next(new AppError(403, "AUTH_FORBIDDEN", "Insufficient permissions"));
    }

    return next();
  };
}
