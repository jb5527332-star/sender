import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.RAILWAY_ENVIRONMENT_NAME) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
}

interface IEnvConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  mongodb: {
    uri: string;
  };
  jwt: {
    secret: string;
    expire: string;
    refreshSecret: string;
    refreshExpire: string;
  };
  encryption: {
    key: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  email: {
    defaultUserDailyLimit: number;
    defaultSmtpDailyLimit: number;
  };
  admin: {
    email: string;
    password: string;
    name: string;
  };
  cors: {
    origin: string;
  };
  logging: {
    level: string;
  };
}

const reportEnvIssues = () => {
  const required = [
    "MONGODB_URI",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "ENCRYPTION_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    console.error("ENCRYPTION_KEY must be exactly 32 characters long");
  }
};

reportEnvIssues();

export const envConfig: IEnvConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  apiPrefix: process.env.API_PREFIX || "/api/v1",

  mongodb: {
    uri: process.env.MONGODB_URI!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expire: process.env.JWT_EXPIRE || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY!,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  email: {
    defaultUserDailyLimit: parseInt(
      process.env.DEFAULT_DAILY_LIMIT_PER_USER || "100",
      10
    ),
    defaultSmtpDailyLimit: parseInt(
      process.env.DEFAULT_DAILY_LIMIT_PER_SMTP || "100",
      10
    ),
  },

  admin: {
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "Admin@123456",
    name: process.env.ADMIN_NAME || "System Admin",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

export default envConfig;
