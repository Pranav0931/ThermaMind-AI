import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues,
      });
    }
    req.body = parsed.data;
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
