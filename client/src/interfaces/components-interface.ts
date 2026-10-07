import { ButtonHTMLAttributes, ReactNode } from "react";
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

export interface EmailFormProps {
  onPreview: (
    data: EmailFormData,
    attachments: File[],
    messageFormat: string
  ) => void;
  onFormChange: (
    data: EmailFormData,
    attachments: File[],
    messageFormat: string
  ) => void;
}

export interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
  format: string;
}

export interface AttachmentUploaderProps {
  onAttachmentsChange: (files: File[]) => void;
  attachments: File[];
  showSelectedList?: boolean;
}

export interface EmailPreviewProps {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  ccEmail: string;
  bccEmail: string;
  replyTo: string;
  subject: string;
  message: string;
  date: string | Date | unknown;
  messageFormat: string;
  attachments: File[];
  priority: EmailPriority;
  tagline: string;
  customHeaders: string;
}

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabContainerProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

export interface Option {
  value: string;
  label: string;
}

export interface FormFieldProps {
  label: string;
  description?: string;
  id: string;
  name: string;
  type?: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  placeholder?: string;
  required?: boolean;
  options?: Option[];
  rows?: number;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "subtle" | "destructive" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "destructive" | "warning";
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export interface CalendarReminderProps {
  onReminderChange: (reminderData: {
    enabled: boolean;
    date: string;
    time: string;
    location: string;
    description: string;
  }) => void;
}

export interface EmailNotificationProps {
  show: boolean;
  onClose: () => void;
  emailDetails: {
    subject: string;
    recipient: string;
    sender: string;
  };
}
