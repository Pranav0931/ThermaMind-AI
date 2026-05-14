import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/http";
import { logger } from "../utils/logger";

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      path: req.originalUrl,
      requestId: req.requestId,
    },
  });
}

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    logger.warn({ error, requestId: req.requestId }, "Handled request error");
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: req.requestId,
      },
    });
  }

  if (error instanceof ZodError) {
    logger.warn({ error, requestId: req.requestId }, "Validation failed");
    return res.status(400).json({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: error.issues,
        requestId: req.requestId,
      },
    });
  }

  logger.error({ error, requestId: req.requestId }, "Unhandled request error");
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
      requestId: req.requestId,
    },
  });
}
