import { EmailPriority } from '../../shared/config/constants';

export interface ISendEmailDTO {
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  ccEmail?: string;
  bccEmail?: string;
  replyTo?: string;
  subject: string;
  message: string;
  messageFormat?: 'html' | 'plain';
  priority?: EmailPriority;
  customHeaders?: string;
  smtpId?: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
  }>;
}

export interface IEmailQueueData extends ISendEmailDTO {
  userId: string;
  smtpId?: string;
}