import mongoose, { Schema, Document } from "mongoose";
import {
  EMAIL_STATUS,
  EMAIL_PRIORITY,
  EmailStatus,
  EmailPriority,
} from "../../shared/config/constants";

export interface IEmailDocument extends Document {
  userId: mongoose.Types.ObjectId;
  smtpId?: mongoose.Types.ObjectId;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  replyTo?: string;
  subject: string;
  message: string;
  messagePreview: string;
  messageFormat: "html" | "plain";
  priority: EmailPriority;
  status: EmailStatus;
  messageId?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
  }>;
  attachmentCount: number;
  sentAt?: Date;
  scheduledFor?: Date;
  ipAddress?: string;
  userAgent?: string;
  customHeaders?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<IEmailDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    smtpId: {
      type: Schema.Types.ObjectId,
      ref: "SmtpServer",
      index: true,
    },
    fromEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    fromName: {
      type: String,
    },
    toEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    ccEmail: {
      type: String,
      lowercase: true,
    },
    bccEmail: {
      type: String,
      lowercase: true,
    },
    replyTo: {
      type: String,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    messagePreview: {
      type: String,
      maxlength: 500,
    },
    messageFormat: {
      type: String,
      enum: ["html", "plain"],
      default: "html",
    },
    priority: {
      type: String,
      enum: Object.values(EMAIL_PRIORITY),
      default: EMAIL_PRIORITY.NORMAL,
    },
    status: {
      type: String,
      enum: Object.values(EMAIL_STATUS),
      default: EMAIL_STATUS.QUEUED,
      index: true,
    },
    messageId: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    attachments: [
      {
        filename: { type: String },
        content: { type: Buffer },
        path: { type: String },
        contentType: { type: String },
      },
    ],
    attachmentCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    customHeaders: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ smtpId: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, scheduledFor: 1 });
emailLogSchema.index({ createdAt: -1 });

// TTL index - delete logs older than 90 days
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const EmailLog = mongoose.model<IEmailDocument>(
  "EmailLog",
  emailLogSchema
);
