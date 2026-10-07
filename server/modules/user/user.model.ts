import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import {
  ROLES,
  SMTP_STRATEGY,
  UserRole,
  SmtpStrategy,
} from "../../shared/config/constants";
import { envConfig } from "../../shared/config/env.config";

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  smtpStrategy: SmtpStrategy;
  isActive: boolean;
  dailyEmailLimit: number;
  emailsSentToday: number;
  lastResetDate: Date;
  totalEmailsSent: number;
  lastLoginAt?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    timestamp: Date | null;
    ipAddress: string | null;
    city: string | null;
    country: string | null;
    hasGrantedPermission: boolean;
  };

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  checkAndResetDailyCounter(): boolean;
  canSendEmail(): boolean;
  incrementEmailCount(): Promise<void>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    smtpStrategy: {
      type: String,
      enum: Object.values(SMTP_STRATEGY),
      default: SMTP_STRATEGY.SHARED_POOL,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dailyEmailLimit: {
      type: Number,
      default: envConfig.email.defaultUserDailyLimit,
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
    lastLoginAt: {
      type: Date,
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      timestamp: { type: Date, default: null },
      ipAddress: { type: String, default: null },
      city: { type: String, default: null },
      country: { type: String, default: null },
      hasGrantedPermission: { type: Boolean, default: false },
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        // delete ret.password;
        delete ret.refreshToken;
        // delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
// userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Reset daily counter if needed
userSchema.methods.checkAndResetDailyCounter = function (): boolean {
  const today = new Date().setHours(0, 0, 0, 0);
  const lastReset = new Date(this.lastResetDate).setHours(0, 0, 0, 0);

  if (today > lastReset) {
    this.emailsSentToday = 0;
    this.lastResetDate = new Date();
    return true;
  }
  return false;
};

// Check if user can send email
userSchema.methods.canSendEmail = function (): boolean {
  if (!this.isActive) return false;
  this.checkAndResetDailyCounter();
  return this.emailsSentToday < this.dailyEmailLimit;
};

// Increment email counter
userSchema.methods.incrementEmailCount = async function (): Promise<void> {
  this.emailsSentToday += 1;
  this.totalEmailsSent += 1;
  await this.save();
};

export const User = mongoose.model<IUserDocument>("User", userSchema);
