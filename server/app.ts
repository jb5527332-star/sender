import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
// import mongoSanitize from "express-mongo-sanitize";
import { envConfig } from "./shared/config/env.config";
import { logger } from "./shared/services/logger.service";
import { errorHandler, notFound } from "./shared/middleware/error.middleware";
import mongoose from "mongoose";

// Import routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import smtpRoutes from "./modules/smtp/smtp.routes";
import emailRoutes from "./modules/email/email.routes";
import assignmentRoutes from "./modules/assignment/assignment.routes";

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.set("trust proxy", 1);

    // Security middleware
    this.app.use(helmet());
    // Temporarily disabled due to Express 5.x compatibility issue
    // this.app.use(mongoSanitize({
    //   replaceWith: '_',
    //   allowDots: false,
    // }));

    // CORS
    const allowedOrigins = envConfig.cors.origin
      .split(",")
      .map((o) => o.trim().replace(/\/$/, ""));

    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
            callback(null, true);
          } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
          }
        },
        credentials: true,
      }),
    );

    // Body parser
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Compression
    this.app.use(compression());

    // Logging
    if (envConfig.nodeEnv === "development") {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(
        morgan("combined", {
          stream: {
            write: (message: string) => logger.info(message.trim()),
          },
        }),
      );
    }

    // Rate limiting disabled
    // this.app.use(apiLimiter);

    logger.info("Middleware initialized");
  }

  private initializeRoutes(): void {
    const apiPrefix = envConfig.apiPrefix;

    // Health check
    this.app.get("/health", (_req, res) => {
      const required = [
        "MONGODB_URI",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
        "ENCRYPTION_KEY",
      ];
      const missing = required.filter((key) => !process.env[key]);
      const dbConnected = mongoose.connection.readyState === 1; // 1 = connected

      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: envConfig.nodeEnv,
        dbConnected,
        hasRequiredEnv: missing.length === 0,
        missingEnv: missing,
      });
    });

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/users`, userRoutes);
    this.app.use(`${apiPrefix}/smtp`, smtpRoutes);
    this.app.use(`${apiPrefix}/emails`, emailRoutes);
    this.app.use(`${apiPrefix}/assignments`, assignmentRoutes);

    logger.info("Routes initialized");
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);

    logger.info("Error handling initialized");
  }

  public getApp(): Application {
    return this.app;
  }
}
