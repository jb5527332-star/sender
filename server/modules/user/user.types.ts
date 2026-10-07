import { UserRole, SmtpStrategy } from '../../shared/config/constants';

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
  password?: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserLocationResponse {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  location?: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    timestamp: Date | null;
    ipAddress: string | null;
    city: string | null;
    country: string | null;
    hasGrantedPermission: boolean;
  };
}