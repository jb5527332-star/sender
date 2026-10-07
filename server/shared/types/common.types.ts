import { Request } from "express";
import { UserRole, SmtpStrategy } from "../config/constants";

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
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
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

export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
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
