"use client";

import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import RichTextEditor from "@/components/rich-text-editor";
import { ISmtpResponse } from "@/interfaces/server-types";
import { sendEmail } from "@/utils/email-service";
import { Zap, Send, Server } from "lucide-react";

export default function AdminWarmupPage() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [smtps, setSmtps] = useState<ISmtpResponse[]>([]);
  const [loadingSmtps, setLoadingSmtps] = useState(true);
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>("");
  const [sendAll, setSendAll] = useState(false);
  const fetchedOnceRef = useRef(false);

  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; size: number; type: string; file: File }>
  >([]);

  const [content, setContent] = useState<string>(
    "<p>Warmup test email. Please ignore.</p>"
  );

  const [form, setForm] = useState({
    fromName: "",
    fromEmail: "",
    toEmail: "",
    ccEmail: "",
    bccEmail: "",
    replyTo: "",
    subject: "Warmup Test",
    customHeaders: "",
  });

  useEffect(() => {
    // Avoid fetching before auth state settles
    if (isLoading) return;

    // Redirect non-admins
    if (!isAuthenticated || !isAdmin) {
      router.push("/dashboard");
      return;
    }

    // Ensure we only fetch once after auth state is ready
    if (fetchedOnceRef.current) return;
    fetchedOnceRef.current = true;

    (async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/smtp?limit=100`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSmtps(data.data);
          if (data.data.length > 0) {
            const first = data.data[0];
            setSelectedSmtpId(first._id);
            setForm((f) => ({
              ...f,
              fromEmail: first.fromEmail || "",
              fromName: first.fromName || "",
            }));
          }
        } else {
          toast({
            title: "Failed to load SMTPs",
            description: data.error || "Unable to fetch SMTP servers",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "Error",
          description: "Could not fetch SMTP servers",
          variant: "destructive",
        });
      } finally {
        setLoadingSmtps(false);
      }
    })();
  }, [isLoading, isAuthenticated, isAdmin, router, toast]);

  const handleSmtpChange = (id: string) => {
    setSelectedSmtpId(id);
    const smtp = smtps.find((s) => s._id === id);
    if (smtp) {
      setForm((f) => ({
        ...f,
        fromEmail: smtp.fromEmail || "",
        fromName: smtp.fromName || "",
      }));
    }
  };

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const doSend = async () => {
    if (!form.toEmail) {
      toast({
        title: "Recipient required",
        description: "Provide a valid 'To' email",
        variant: "destructive",
      });
      return;
    }

    const toList = form.toEmail
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const activeSmtps = sendAll
      ? smtps.filter((s) => s.isActive)
      : smtps.filter((s) => s._id === selectedSmtpId);

    if (activeSmtps.length === 0) {
      toast({
        title: "No SMTP selected",
        description: "Choose at least one SMTP server",
        variant: "destructive",
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const smtp of activeSmtps) {
      for (const to of toList) {
        const payload = {
          fromEmail: form.fromEmail,
          fromName: form.fromName,
          toEmail: to,
          ccEmail: form.ccEmail,
          bccEmail: form.bccEmail,
          replyTo: form.replyTo,
          subject: form.subject,
          priority: "normal",
          tagline: "",
          message: content,
          customHeaders: form.customHeaders,
          smtpId: smtp._id,
        } as import("@/interfaces/utils-interface").EmailFormData;

        const files = attachments.map((a) => a.file);
        const res = await sendEmail(payload, files, "html");
        if (res.success) successCount++;
        else failCount++;
      }
    }

    toast({
      title: "Warmup Complete",
      description: `Success: ${successCount}, Failed: ${failCount}`,
      variant: failCount === 0 ? "success" : "warning",
    });
  };

  return (
    <DashboardLayout>
      <div className=" mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">SMTP Warmup Test</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* SMTP selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Server className="w-4 h-4" /> Select SMTP
              </label>
              <select
                className="mt-1 w-full border rounded-md p-2"
                value={selectedSmtpId}
                disabled={loadingSmtps || sendAll}
                onChange={(e) => handleSmtpChange(e.target.value)}
              >
                {loadingSmtps ? (
                  <option>Loading...</option>
                ) : (
                  smtps.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.host})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="sendAll"
                type="checkbox"
                className="w-4 h-4"
                checked={sendAll}
                onChange={(e) => setSendAll(e.target.checked)}
              />
              <label htmlFor="sendAll" className="text-sm text-gray-700">
                Test via all active SMTPs
              </label>
            </div>
          </div>

          {/* Sender and recipient fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                From Name
              </label>
              <input
                name="fromName"
                value={form.fromName}
                onChange={handleInput}
                className="mt-1 w-full border rounded-md p-2"
                placeholder="Sender name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                From Email
              </label>
              <input
                name="fromEmail"
                value={form.fromEmail}
                onChange={handleInput}
                className="mt-1 w-full border rounded-md p-2"
                placeholder="sender@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                To Email(s)
              </label>
              <input
                name="toEmail"
                value={form.toEmail}
                onChange={handleInput}
                className="mt-1 w-full border rounded-md p-2"
                placeholder="recipient@example.com, other@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Reply-To
              </label>
              <input
                name="replyTo"
                value={form.replyTo}
                onChange={handleInput}
                className="mt-1 w-full border rounded-md p-2"
                placeholder="reply@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CC</label>
              <input
                name="ccEmail"
                value={form.ccEmail}
                onChange={handleInput}
                className="mt-1 w-full border rounded-md p-2"
                placeholder="cc@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">BCC</label>
              <input
                name="bccEmail"
                value={form.bccEmail}
                onChange={handleInput}
                className="mt-1 w-full border rounded-md p-2"
                placeholder="bcc@example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <input
              name="subject"
              value={form.subject}
              onChange={handleInput}
              className="mt-1 w-full border rounded-md p-2"
              placeholder="Warmup test"
            />
          </div>

          {/* Rich text editor */}
          <div>
            <label className="text-sm font-medium text-gray-700">Message</label>
            <div className="mt-2">
              <RichTextEditor
                content={content}
                onChange={setContent}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={doSend}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Send className="w-4 h-4" /> Send Test
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
