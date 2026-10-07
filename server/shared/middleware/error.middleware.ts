import { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger.service";
import { ResponseUtil } from "../utils/response.util";
import { HTTP_STATUS } from "../config/constants";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: _req.url,
    method: _req.method,
  });

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new AppError(message, HTTP_STATUS.NOT_FOUND);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, HTTP_STATUS.CONFLICT);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(", ");
    error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired", HTTP_STATUS.UNAUTHORIZED);
  }

  return ResponseUtil.error(
    res,
    error.message || "Internal server error",
    error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND,
  );
  next(error);
};
