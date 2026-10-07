import { EmailPriority, IApiResponse } from "./server-types";

export type LogLevel = "info" | "success" | "error" | "warning";

export interface Log {
  time: string;
  message: string;
  level: LogLevel;
}

export interface LoggerContextType {
  logs: Log[];
  addLogEntry: (message: string, level?: LogLevel) => void;
  clearLogs: () => void;
}

export interface EmailFormData {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  ccEmail: string;
  bccEmail: string;
  replyTo: string;
  subject: string;
  priority: EmailPriority;
  tagline: string;
  message: string;
  customHeaders: string;
  smtpId?: string;
}

// Extended EmailResponse type for email sending responses
export interface EmailResponse extends IApiResponse {
  messageId?: string;
}

export interface CalendarEvent {
  enabled: boolean;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer: {
    name: string;
    email: string;
  };
  attendees: string[];
}
