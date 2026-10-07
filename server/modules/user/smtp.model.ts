import mongoose, { Schema, Document } from "mongoose";
import { SMTP_STATUS, SmtpStatus } from "../../shared/config/constants";
import { envConfig } from "../../shared/config/env.config";
import { encrypt, decrypt } from "../../shared/services/encryption.service";

export interface ISmtpDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  dkimEnabled?: boolean;
  dkimDomain?: string;
  dkimSelector?: string;
  dkimPrivateKey?: string;
  listUnsubscribeEmail?: string;
  listUnsubscribeUrl?: string;
  dailyLimit: number;
  emailsSentToday: number;
  lastResetDate: Date;
  totalEmailsSent: number;
  successCount: number;
  failureCount: number;
  isActive: boolean;
  status: SmtpStatus;
  lastUsedAt?: Date;
  lastHealthCheckAt?: Date;
  healthCheckStatus: "healthy" | "unhealthy" | "pending";
  priority: number;
  notes?: string;
  isSharedPool: boolean;
  availableToUsers: boolean;
  rateLimitedUntil?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  successRate: number;

  // Methods
  checkAndResetDailyCounter(): boolean;
  canSendEmail(): boolean;
  incrementEmailCount(success: boolean): Promise<void>;
  getNodemailerConfig(): any;
}

const smtpServerSchema = new Schema<ISmtpDocument>(
  {
    name: {
      type: String,
      required: [true, "SMTP server name is required"],
      trim: true,
    },
    host: {
      type: String,
      required: [true, "SMTP host is required"],
      trim: true,
    },
    port: {
      type: Number,
      required: [true, "SMTP port is required"],
      min: 1,
      max: 65535,
    },
    secure: {
      type: Boolean,
      default: false,
    },
    username: {
      type: String,
      required: [true, "SMTP username is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "SMTP password is required"],
      set: encrypt,
      get: decrypt,
    },
    fromEmail: {
      type: String,
      required: [true, "From email is required"],
      lowercase: true,
      trim: true,
    },
    fromName: {
      type: String,
      trim: true,
    },
    dkimEnabled: {
      type: Boolean,
      default: false,
    },
    dkimDomain: {
      type: String,
      trim: true,
    },
    dkimSelector: {
      type: String,
      trim: true,
    },
    dkimPrivateKey: {
      type: String,
      set: encrypt,
      get: decrypt,
    },
    listUnsubscribeEmail: {
      type: String,
      trim: true,
    },
    listUnsubscribeUrl: {
      type: String,
      trim: true,
    },
    dailyLimit: {
      type: Number,
      default: envConfig.email.defaultSmtpDailyLimit,
      min: 1,
    },
    emailsSentToday: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
    totalEmailsSent: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: Object.values(SMTP_STATUS),
      default: SMTP_STATUS.ACTIVE,
    },
    lastUsedAt: {
      type: Date,
    },
    lastHealthCheckAt: {
      type: Date,
    },
    healthCheckStatus: {
      type: String,
      enum: ["healthy", "unhealthy", "pending"],
      default: "pending",
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    notes: {
      type: String,
    },
    isSharedPool: {
      type: Boolean,
      default: true,
    },
    availableToUsers: {
      type: Boolean,
      default: false,
    },
    rateLimitedUntil: {
      type: Date,
    },
    lastError: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform: function (_doc, ret) {
        // Don't expose password even if encrypted
        // delete ret.password;
        // delete ret.__v;
        // Never expose DKIM private key
        delete ret.dkimPrivateKey;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      getters: true,
    },
  }
);

// Indexes
smtpServerSchema.index({ isActive: 1, status: 1 });
smtpServerSchema.index({ isSharedPool: 1, isActive: 1 });
smtpServerSchema.index({ lastUsedAt: 1 });

// Virtual for success rate
smtpServerSchema.virtual("successRate").get(function () {
  const total = this.successCount + this.failureCount;
  if (total === 0) return 100;
  return parseFloat(((this.successCount / total) * 100).toFixed(2));
});

// Reset daily counter if needed
smtpServerSchema.methods.checkAndResetDailyCounter = function (): boolean {
  const today = new Date().setHours(0, 0, 0, 0);
  const lastReset = new Date(this.lastResetDate).setHours(0, 0, 0, 0);

  if (today > lastReset) {
    this.emailsSentToday = 0;
    this.lastResetDate = new Date();
    return true;
  }
  return false;
};

// Check if SMTP can send email
smtpServerSchema.methods.canSendEmail = function (): boolean {
  if (!this.isActive) return false;
  if (this.status !== SMTP_STATUS.ACTIVE) return false;

  this.checkAndResetDailyCounter();
  return this.emailsSentToday < this.dailyLimit;
};

// Increment email counter
smtpServerSchema.methods.incrementEmailCount = async function (
  success: boolean = true
): Promise<void> {
  this.emailsSentToday += 1;
  this.totalEmailsSent += 1;
  this.lastUsedAt = new Date();

  if (success) {
    this.successCount += 1;
    // Reset status to active if it was failed
    if (this.status === SMTP_STATUS.FAILED) {
      this.status = SMTP_STATUS.ACTIVE;
    }
  } else {
    this.failureCount += 1;

    // Auto-disable if failure rate is too high
    const total = this.successCount + this.failureCount;
    const failureRate = (this.failureCount / total) * 100;

    if (total >= 10 && failureRate > 50) {
      this.status = SMTP_STATUS.FAILED;
      this.isActive = false;
    }
  }

  await this.save();
};

// Get SMTP config for nodemailer
smtpServerSchema.methods.getNodemailerConfig = function (): any {
  return {
    host: this.host,
    port: this.port,
    secure: this.secure,
    auth: {
      user: this.username,
      pass: this.password, // Will be decrypted by getter
    },
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
  };
};

export const SmtpServer = mongoose.model<ISmtpDocument>(
  "SmtpServer",
  smtpServerSchema
);
