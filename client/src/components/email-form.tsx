"use client";

import React, { useState, useRef, FormEvent } from "react";

import {
  EmailFormData,
  EmailFormProps,
} from "@/interfaces/components-interface";

import FormField from "@/components/form-field";
import Button from "@/components/button";
import AttachmentUploader from "@/components/attachment-uploader";
import EmailNotification from "@/components/email-notification";
import { useToast } from "@/components/toast";

import { sendEmail } from "@/utils/email-service";
import { useLogger } from "@/utils/logger";
import RichTextEditor from "./rich-text-editor";
import TextEditor from "./text-editor";
import ContentOptimizer from "./content-optimizer";

const DEFAULT_FORM_DATA: EmailFormData = {
  fromName: "",
  fromEmail: "",
  toEmail: "",
  ccEmail: "",
  bccEmail: "",
  replyTo: "",
  subject: "",
  priority: "normal",
  tagline: "",
  message: "",
  customHeaders: "",
};

export default function EmailForm({ onPreview, onFormChange }: EmailFormProps) {
  const [formData, setFormData] = useState<EmailFormData>(DEFAULT_FORM_DATA);
  const [messageFormat, setMessageFormat] = useState<string>("html");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [editorAttachments, setEditorAttachments] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      file: File;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { addLogEntry } = useLogger();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    onFormChange(updatedData, attachments, messageFormat);
  };

  const handleMessageChange = (content: string) => {
    const updatedData = { ...formData, message: content };
    setFormData(updatedData);
    onFormChange(updatedData, attachments, messageFormat);
  };

  const handleFormatChange = (format: string) => {
    setMessageFormat(format);
    onFormChange(formData, attachments, format);
  };

  const handleAttachmentChange = (files: File[]) => {
    setAttachments(files);
    onFormChange(formData, files, messageFormat);
  };

  const handleEditorAttachmentsChange = (
    attachments: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      file: File;
    }>
  ) => {
    setEditorAttachments(attachments);
    // Also update the main attachments for compatibility
    const files = attachments.map((att) => att.file);
    setAttachments(files);
    onFormChange(formData, files, messageFormat);
  };

  const viewPreview = () => {
    onPreview(formData, attachments, messageFormat);
  };

  // const handleEditorSend = async (
  //   content: string,
  //   editorAttachments: Array<{
  //     id: string;
  //     name: string;
  //     size: number;
  //     type: string;
  //     file: File;
  //   }>
  // ) => {
  //   // Update form data with editor content
  //   const updatedFormData = { ...formData, message: content };
  //   setFormData(updatedFormData);

  //   // Update attachments
  //   const files = editorAttachments.map((att) => att.file);
  //   setAttachments(files);
  //   setEditorAttachments(editorAttachments);

  //   // Update preview data for parent component
  //   onFormChange(updatedFormData, files, messageFormat);

  //   // Note: Removed automatic form submission - emails should only be sent when user clicks Send button
  // };

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  // Content sanitization function to remove base64 encoded data
  const sanitizeContent = (content: string): string => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.fromEmail ||
      !formData.toEmail ||
      !formData.subject ||
      !formData.message
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    addLogEntry("Preparing to send email...", "info");

    try {
      // Sanitize the message content before sending
      const sanitizedFormData = {
        ...formData,
        message: sanitizeContent(formData.message),
      };

      // Send email using the service
      const result = await sendEmail(
        sanitizedFormData,
        attachments.map((file) => file),
        messageFormat
      );

      if (result.success) {
        addLogEntry(
          `Email sent successfully! Message ID: ${result.messageId}`,
          "success"
        );

        // Show notification instead of toast
        setShowNotification(true);

        // Play success sound
        const audio = new Audio("/notification-sound.mp3");
        audio.volume = 0.5;
        audio.play().catch((e) => console.log("Audio playback error:", e));

        // Optionally reset form after delay
        setTimeout(() => {
          if (
            window.confirm(
              "Email sent successfully! Would you like to clear the form?"
            )
          ) {
            if (formRef.current) formRef.current.reset();
            setFormData(DEFAULT_FORM_DATA);
            setAttachments([]);
          }
        }, 2000);
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      addLogEntry(`Error sending email: ${errorMessage}`, "error");
      toast({
        title: "Error",
        description: `Failed to send email: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleSend = (content: string) => {
  //   // Update form data with the content from RichTextEditor
  //   const updatedData = { ...formData, message: content };
  //   setFormData(updatedData);
  //   onFormChange(updatedData, attachments, messageFormat);

  //   // Trigger form submission
  //   if (formRef.current) {
  //     const submitEvent = new Event("submit", {
  //       bubbles: true,
  //       cancelable: true,
  //     });
  //     formRef.current.dispatchEvent(submitEvent);
  //   }
  // };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          label="From Name"
          id="fromName"
          name="fromName"
          value={formData.fromName}
          onChange={handleInputChange}
          placeholder="Sender Name"
        />
        <FormField
          label="From Email"
          id="fromEmail"
          name="fromEmail"
          type="email"
          value={formData.fromEmail}
          onChange={handleInputChange}
          placeholder="sender@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <FormField
          label="To"
          id="toEmail"
          name="toEmail"
          type="email"
          value={formData.toEmail}
          onChange={handleInputChange}
          placeholder="recipient@example.com"
          required
        />
        <FormField
          label="CC"
          id="ccEmail"
          name="ccEmail"
          type="email"
          value={formData.ccEmail}
          onChange={handleInputChange}
          placeholder="cc@example.com"
        />
        <FormField
          label="BCC"
          id="bccEmail"
          name="bccEmail"
          type="email"
          value={formData.bccEmail}
          onChange={handleInputChange}
          placeholder="bcc@example.com"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          label="Subject"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleInputChange}
          placeholder="Email Subject"
          required
        />
        <FormField
          label="Priority"
          id="priority"
          name="priority"
          type="select"
          value={formData.priority}
          onChange={handleInputChange}
          options={[
            { value: "normal", label: "Normal" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          label="Reply-To"
          id="replyTo"
          name="replyTo"
          type="email"
          value={formData.replyTo}
          onChange={handleInputChange}
          placeholder="reply-to@example.com"
        />
        <FormField
          label="Preview Text"
          id="tagline"
          name="tagline"
          value={formData.tagline}
          onChange={handleInputChange}
          placeholder="Brief preview text that appears in email clients"
        />
      </div>

      <div>
        <FormField
          label="Message Format"
          id="messageFormat"
          name="messageFormat"
          type="select"
          value={messageFormat}
          onChange={(e: { target: { value: string } }) =>
            handleFormatChange(e.target.value)
          }
          options={[
            { value: "html", label: "HTML" },
            { value: "plain", label: "Plain Text" },
          ]}
        />
      </div>

      {messageFormat === "html" ? (
        <RichTextEditor
          content={formData.message}
          onChange={handleMessageChange}
          onAttachmentsChange={handleEditorAttachmentsChange}
          attachments={editorAttachments}
        />
      ) : (
        <>
          <TextEditor
            content={formData.message}
            onChange={handleMessageChange}
            format={messageFormat}
          />
          <AttachmentUploader
            onAttachmentsChange={handleAttachmentChange}
            attachments={attachments}
            showSelectedList={true}
          />
        </>
      )}

      {/* Content Optimizer */}
      <ContentOptimizer
        subject={formData.subject}
        message={formData.message}
        onOptimize={(optimizedSubject, optimizedMessage) => {
          const updatedData = {
            ...formData,
            subject: optimizedSubject,
            message: optimizedMessage,
          };
          setFormData(updatedData);
          if (onFormChange) {
            onFormChange(updatedData, attachments, messageFormat);
          }
        }}
        className="mb-6"
      />

      <div className="flex justify-end gap-4">
        {messageFormat !== "html" && (
          <Button type="button" variant="outline" onClick={viewPreview}>
            Preview
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Email"}
        </Button>
      </div>

      <EmailNotification
        show={showNotification}
        onClose={handleCloseNotification}
        emailDetails={{
          subject: formData.subject || "No Subject",
          recipient: formData.toEmail,
          sender: formData.fromEmail,
        }}
      />
    </form>
  );
}
