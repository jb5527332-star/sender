"use client";

import React from "react";

import { EmailPreviewProps } from "@/interfaces/components-interface";

export default function EmailPreview({
  fromName,
  fromEmail,
  toEmail,
  ccEmail,
  bccEmail,
  replyTo,
  subject,
  message,
  date,
  messageFormat,
  attachments,
  priority,
  tagline,
  customHeaders,
}: EmailPreviewProps) {
  const formattedDate = React.useMemo(() => {
    if (!date) return ""; 
    
    try {
      if (typeof date === "string") {
        return new Date(date).toLocaleString();
      }
      
      return String(date);
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Date unavailable";
    }
  }, [date]);

  // Content sanitization function to match what gets sent
  const sanitizeContent = React.useMemo(() => {
    return (content: string): string => {
      // Remove base64 encoded images
      let sanitized = content.replace(
        /<img[^>]*src="data:image\/[^\"]*"[^>]*>/gi,
        '<p style="color: #666; font-style: italic; border: 1px dashed #ccc; padding: 10px; margin: 10px 0;">[Image removed - Please use the attachment uploader to add images]</p>'
      );

      // Remove any other base64 encoded content
      sanitized = sanitized.replace(
        /data:[^;]+;base64,[A-Za-z0-9+/=]+/g,
        "[Base64 content removed - Please use the attachment uploader]"
      );

      // Remove extremely long strings that might be encoded data
      sanitized = sanitized.replace(
        /[A-Za-z0-9+/=]{200,}/g,
        "[Large encoded content removed - Please use the attachment uploader]"
      );

      return sanitized;
    };
  }, []);

  // Get sanitized message content
  const sanitizedMessage = React.useMemo(() => {
    return sanitizeContent(message);
  }, [message, sanitizeContent]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="border rounded-md overflow-hidden shadow-sm">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b dark:border-gray-700">
        <h3 className="text-lg font-semibold">{subject || "No Subject"}</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
          <div>
            <span className="font-medium">From:</span>{" "}
            {fromName
              ? `${fromName} <${fromEmail}>`
              : fromEmail || "sender@example.com"}
          </div>
          <div>
            <span className="font-medium">To:</span>{" "}
            {toEmail || "recipient@example.com"}
          </div>
          {ccEmail && (
            <div>
              <span className="font-medium">CC:</span> {ccEmail}
            </div>
          )}
          {bccEmail && (
            <div>
              <span className="font-medium">BCC:</span> {bccEmail}
            </div>
          )}
          {replyTo && (
            <div>
              <span className="font-medium">Reply-To:</span> {replyTo}
            </div>
          )}
          {priority && priority !== 'normal' && (
            <div>
              <span className="font-medium">Priority:</span> <span className="capitalize">{priority}</span>
            </div>
          )}
          {tagline && (
            <div>
              <span className="font-medium">Tagline:</span> {tagline}
            </div>
          )}
          {customHeaders && (
            <div>
              <span className="font-medium">Headers:</span> <span className="font-mono text-sm whitespace-pre-wrap">{customHeaders}</span>
            </div>
          )}
          <div>
            <span className="font-medium">Date:</span> {formattedDate}
          </div>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-900">
        {messageFormat === "html" ? (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizedMessage || "Your message will appear here...",
            }}
          />
        ) : (
          <pre className="whitespace-pre-wrap font-sans">
            {sanitizedMessage || "Your message will appear here..."}
          </pre>
        )}
      </div>
      {attachments && attachments.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attachments:
          </h4>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="px-3 py-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md text-sm flex items-center"
              >
                <span className="mr-2">
                  {file.type === "application/pdf" ? "📄" : "🖼️"}
                </span>
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">
                  ({formatFileSize(file.size)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
