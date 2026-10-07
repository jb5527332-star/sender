import { App } from "./app";
import dns from "dns";
import { database } from "./shared/config/database.config";
import { envConfig } from "./shared/config/env.config";
import { logger } from "./shared/services/logger.service";
import { emailWatcherService } from "./modules/email/email-watcher.service";
import { User } from "./modules/user/user.model";
import { ROLES } from "./shared/config/constants";

// Prefer IPv4 to avoid platforms with limited IPv6 egress causing SMTP timeouts
try {
  dns.setDefaultResultOrder("ipv4first");
  // dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  logger.warn("Could not set DNS config");
}

class Server {
  private app: App;

  constructor() {
    this.app = new App();
  }

  async start(): Promise<void> {
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = "0.0.0.0";

    this.app.getApp().listen(port, host, () => {
      logger.info(`🚀 Server running on ${host}:${port}`);
      logger.info(`🌍 Environment: ${envConfig.nodeEnv}`);
    });

    try {
      // Connect to database
      await database.connect();

      // Create default admin if no users exist
      await this.createDefaultAdmin();

      // Start email watcher service
      emailWatcherService.start();
      logger.info(`📧 Email queue service active`);
      logger.info(`👁️  Email watcher service active`);
    } catch (error) {
      logger.error("Startup tasks failed (DB/services):", error);
      // Keep process alive for diagnostics; consider adding reconnect logic.
    }
  }

  private async createDefaultAdmin(): Promise<void> {
    try {
      const userCount = await User.countDocuments();

      if (userCount === 0) {
        const admin = await User.create({
          email: envConfig.admin.email,
          password: envConfig.admin.password,
          name: envConfig.admin.name,
          role: ROLES.ADMIN,
        });

        logger.info(`✅ Default admin created: ${admin.email}`);
        logger.info(`⚠️  Please change the default password!`);
      }
    } catch (error) {
      logger.error("Error creating default admin:", error);
    }
  }

  async stop(): Promise<void> {
    try {
      await emailWatcherService.stop();
      await database.disconnect();
      logger.info("Server stopped gracefully");
    } catch (error) {
      logger.error("Error stopping server:", error);
    }
  }
}

// Create and start server
const server = new Server();
server.start();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await server.stop();
  setTimeout(() => process.exit(0), 1000);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await server.stop();
  setTimeout(() => process.exit(0), 1000);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  // Do not exit; keep service alive to allow platform diagnostics
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Do not exit; keep service alive to allow platform diagnostics
});
