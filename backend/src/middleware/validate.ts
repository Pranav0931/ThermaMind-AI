import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/http";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_FAILED", "Request body validation failed", parsed.error.issues));
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_FAILED", "Request params validation failed", parsed.error.issues));
    }
    req.params = parsed.data as Request["params"];
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_FAILED", "Request query validation failed", parsed.error.issues));
    }
    req.query = parsed.data as Request["query"];
    return next();
  };
}

export function parseDateQuery(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parseLimitQuery(value: unknown, fallback = 250, max = 1000) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), max);
}
