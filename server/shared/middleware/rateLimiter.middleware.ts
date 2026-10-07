import rateLimit from "express-rate-limit";
import { envConfig } from "../config/env.config";
import { ERROR_MESSAGES } from "../config/constants";

export const apiLimiter = rateLimit({
  windowMs: envConfig.rateLimit.windowMs,
  max: envConfig.rateLimit.maxRequests,
  message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again later",
  skipSuccessfulRequests: true,
});

export const emailLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 emails per minute
  message: "Too many emails sent, please slow down",
});
