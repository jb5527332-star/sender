import { EmailPriority } from "./server-types";

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
}
