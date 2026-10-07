"use client";

import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
import { Send, Eye, Loader2 } from "lucide-react";
import RichTextEditor from "@/components/rich-text-editor";
import { useToast } from "@/components/toast";
import { sendEmail } from "@/utils/email-service";
import { EmailFormData } from "@/interfaces/custom-pages-interface";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth, withAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";
import { ISmtpResponse } from "@/interfaces/server-types";

function ComposeEmailPage() {
  // const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>("");
  const [availableSmtps, setAvailableSmtps] = useState<ISmtpResponse[]>([]);
  const [loadingSmtps, setLoadingSmtps] = useState(false);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState<EmailFormData>({
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
  });

  useEffect(() => {
    if (isAdmin) {
      loadAvailableSmtps();
    } else {
      (async () => {
        try {
          const result = await apiClient.getNextFromAddress();
          if (result.success && result.data) {
            setFormData((prev) => ({
              ...prev,
              fromEmail: result.data.fromEmail || prev.fromEmail,
              fromName: result.data.fromName || prev.fromName,
            }));
          }
        } catch {}
      })();
    }
  }, [isAdmin]);

  const loadAvailableSmtps = async () => {
    try {
      setLoadingSmtps(true);
      const response = await apiClient.getAvailableSmtps();
      if (response.success) {
        setAvailableSmtps(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load SMTPs:", error);
    } finally {
      setLoadingSmtps(false);
    }
  };

  const [editorAttachments, setEditorAttachments] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      file: File;
    }>
  >([]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMessageChange = (content: string) => {
    setFormData((prev) => ({ ...prev, message: content }));
  };

  const handleSendEmail = async () => {
    if (!formData.toEmail || !formData.subject || !formData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const files = editorAttachments.map((att) => att.file);
      const emailData = selectedSmtpId
        ? { ...formData, smtpId: selectedSmtpId }
        : formData;

      const result = await sendEmail(emailData, files, "html");

      if (result.success) {
        toast({
          title: "Email Sent Successfully!",
          description: "Your email has been queued and will be sent shortly.",
          variant: "success",
        });

        // ✅ Keep form data - DON'T reset, DON'T redirect
        // Refresh next from address for non-admin users
        if (!isAdmin) {
          try {
            const next = await apiClient.getNextFromAddress();
            if (next.success && next.data) {
              setFormData((prev) => ({
                ...prev,
                fromEmail: next.data.fromEmail || prev.fromEmail,
                fromName: next.data.fromName || prev.fromName,
              }));
            }
          } catch {}
        }
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while sending the email";

      toast({
        title: "Failed to Send",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Compose Email</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and send a new email
            </p>
          </div>
         <div className="flex items-center gap-3">
          {/* SMTP Selector - Admin Only */}
          {isAdmin && (
            <div className="min-w-[250px]">
              <select
                value={selectedSmtpId}
                onChange={(e) => setSelectedSmtpId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                disabled={loadingSmtps}
              >
                <option value="">All SMTP Servers</option>
                {availableSmtps.map((smtp) => (
                  <option key={smtp._id} value={smtp._id}>
                    {smtp.name} 
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-outline"
          >
            <Eye className="w-5 h-5" />
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={isSending}
            className="btn-primary"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Email
              </>
            )}
          </button>
        </div>
        </div>

        {!showPreview ? (
          <div className="dashboard-card">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    From Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fromName"
                    value={formData.fromName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    From Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="fromEmail"
                    value={formData.fromEmail}
                    onChange={handleInputChange}
                    placeholder="sender@example.com"
                    className={`form-input ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    readOnly={!isAdmin}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  To Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="toEmail"
                  value={formData.toEmail}
                  onChange={handleInputChange}
                  placeholder="recipient@example.com"
                  className="form-input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">CC Email</label>
                  <input
                    type="email"
                    name="ccEmail"
                    value={formData.ccEmail}
                    onChange={handleInputChange}
                    placeholder="cc@example.com"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">BCC Email</label>
                  <input
                    type="email"
                    name="bccEmail"
                    value={formData.bccEmail}
                    onChange={handleInputChange}
                    placeholder="bcc@example.com"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Reply To</label>
                  <input
                    type="email"
                    name="replyTo"
                    value={formData.replyTo}
                    onChange={handleInputChange}
                    placeholder="replyto@example.com"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Project Update"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  placeholder="Optional tagline"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Message</label>
                <div className="mt-2">
                  <RichTextEditor
                    content={formData.message}
                    onChange={handleMessageChange}
                    attachments={editorAttachments}
                    onAttachmentsChange={setEditorAttachments}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-card">
            <div className="p-6">
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold">Preview</h2>
                <p>
                  <strong>From:</strong> {formData.fromName} &lt;
                  {formData.fromEmail}&gt;
                </p>
                <p>
                  <strong>To:</strong> {formData.toEmail}
                </p>
                {formData.ccEmail && (
                  <p>
                    <strong>CC:</strong> {formData.ccEmail}
                  </p>
                )}
                {formData.bccEmail && (
                  <p>
                    <strong>BCC:</strong> {formData.bccEmail}
                  </p>
                )}
                {formData.replyTo && (
                  <p>
                    <strong>Reply-To:</strong> {formData.replyTo}
                  </p>
                )}
                <p>
                  <strong>Subject:</strong> {formData.subject}
                </p>
                {formData.tagline && (
                  <p>
                    <strong>Tagline:</strong> {formData.tagline}
                  </p>
                )}
                <div
                  className="mt-4"
                  dangerouslySetInnerHTML={{ __html: formData.message }}
                />
                {editorAttachments.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium">Attachments:</p>
                    <ul className="list-disc ml-5">
                      {editorAttachments.map((att) => (
                        <li key={att.id}>
                          {att.name} ({Math.round(att.size / 1024)} KB)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(ComposeEmailPage);
