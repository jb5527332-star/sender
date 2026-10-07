// Server-side types mirrored for frontend use
// These types should match exactly with the server-side definitions

import { LocationData } from "./location-interface";

// Constants and Enums
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const SMTP_STRATEGY = {
  DEDICATED: "dedicated",
  SHARED_POOL: "shared_pool",
  ASSIGNED: "assigned",
} as const;

export type SmtpStrategy = (typeof SMTP_STRATEGY)[keyof typeof SMTP_STRATEGY];

export const SMTP_STATUS = {
  ACTIVE: "active",
  RATE_LIMITED: "rate_limited",
  FAILED: "failed",
  DISABLED: "disabled",
} as const;

export type SmtpStatus = (typeof SMTP_STATUS)[keyof typeof SMTP_STATUS];

export const EMAIL_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
  RETRYING: "retrying",
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export const EMAIL_PRIORITY = {
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
} as const;

export type EmailPriority =
  (typeof EMAIL_PRIORITY)[keyof typeof EMAIL_PRIORITY];

// User Types
export interface ICreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  smtpStrategy?: SmtpStrategy;
  dailyEmailLimit?: number;
}

export interface IUpdateUserDTO {
  name?: string;
  role?: UserRole;
  smtpStrategy?: SmtpStrategy;
  isActive?: boolean;
  dailyEmailLimit?: number;
}

export interface IUserResponse {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  smtpStrategy: SmtpStrategy;
  isActive: boolean;
  dailyEmailLimit: number;
  emailsSentToday: number;
  totalEmailsSent: number;
  failedCount?: number;
  successRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

// SMTP Types
export interface ICreateSmtpDTO {
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  dailyLimit?: number;
  priority?: number;
  notes?: string;
  isSharedPool?: boolean;
  availableToUsers?: boolean;
}

export interface IUpdateSmtpDTO {
  name?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  dailyLimit?: number;
  isActive?: boolean;
  status?: SmtpStatus;
  priority?: number;
  notes?: string;
  isSharedPool?: boolean;
  availableToUsers?: boolean;
}

export interface ISmtpResponse {
  _id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName?: string;
  dailyLimit: number;
  emailsSentToday: number;
  totalEmailsSent: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  isActive: boolean;
  status: SmtpStatus;
  priority: number;
  isSharedPool: boolean;
  availableToUsers: boolean;
  lastUsedAt?: Date;
  rateLimitedUntil?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Email Types
export interface ISendEmailDTO {
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  replyTo?: string;
  subject: string;
  message: string;
  messageFormat?: "html" | "plain";
  priority?: EmailPriority;
  customHeaders?: string;
  smtpId?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
}

export interface IEmailQueueData extends ISendEmailDTO {
  userId: string;
  smtpId?: string;
}

// Assignment Types
export interface ICreateAssignmentDTO {
  userId: string;
  smtpId: string;
  priority?: number;
  isPrimary?: boolean;
}

export interface IUpdateAssignmentDTO {
  priority?: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface IAssignmentResponse {
  _id: string;
  userId: string;
  smtpId: string;
  priority: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Auth Types
export interface ILoginDTO {
  email: string;
  password: string;
}

export interface IRegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface IAuthResponse {
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshTokenDTO {
  refreshToken: string;
}

// Common Types
export interface IUser {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  smtpStrategy: SmtpStrategy;
  isActive: boolean;
  dailyEmailLimit: number;
  emailsSentToday: number;
  totalEmailsSent: number;
  location?: LocationData;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ITokens {
  accessToken: string;
  refreshToken: string;
}

export interface IEmailAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

// Dashboard Stats Types (derived from server responses)
export interface SmtpStats {
  totalServers: number;
  activeServers: number;
  totalEmailsSent: number;
  successRate: number;
  smtpDetails?: ISmtpResponse[];
}

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  todaysSent: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface AdminStats {
  smtp: SmtpStats;
  email: EmailStats;
  queue: QueueStats;
  users: IUserResponse[];
}
