import { SmtpStatus } from '../../shared/config/constants';

export interface ICreateSmtpDTO {
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
  dkimEnabled?: boolean;
  dkimDomain?: string;
  dkimSelector?: string;
  dkimPrivateKey?: string; // do not expose in responses
  listUnsubscribeEmail?: string;
  listUnsubscribeUrl?: string;
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
  dkimEnabled?: boolean;
  dkimDomain?: string;
  dkimSelector?: string;
  listUnsubscribeEmail?: string;
  listUnsubscribeUrl?: string;
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
  rateLimitedUntil?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}