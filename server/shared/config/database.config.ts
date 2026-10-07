import mongoose from "mongoose";
import { envConfig } from "./env.config";
import logger from "../../shared/services/logger.service";

export class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    try {
      mongoose.set("strictQuery", false);

      const conn = await mongoose.connect(envConfig.mongodb.uri);

      logger.info(`MongoDB Connected: ${conn.connection.host}`);

      // Connection event handlers
      mongoose.connection.on("connected", () => {
        logger.info("MongoDB connection established");
      });

      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection error: ${err}`);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.info(`${signal} received. Closing MongoDB connection...`);
        await this.disconnect();
        process.exit(0);
      };

      process.on("SIGINT", () => gracefulShutdown("SIGINT"));
      process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    } catch (error) {
      logger.error(`Error connecting to MongoDB: ${error}`);
      throw error; // Avoid hard exit; let caller decide how to handle
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    } catch (error) {
      logger.error(`Error closing MongoDB connection: ${error}`);
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export const database = Database.getInstance();
