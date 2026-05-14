import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: "Not found", path: req.path });
}

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ error }, "Unhandled request error");
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "production" ? undefined : error.message,
  });
}
