"use client";

import { EmailFormData, EmailResponse } from "@/interfaces/utils-interface";

export async function sendEmail(
  formData: EmailFormData,
  attachments: File[],
  messageFormat: string
): Promise<EmailResponse> {
  try {
    const processedAttachments = await Promise.all(
      attachments.map(async (file) => {
        return new Promise<{
          filename: string;
          content: string;
          contentType: string;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve({
              filename: file.name,
              content: base64,
              contentType: file.type,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    const token = localStorage.getItem("authToken");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/emails/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          messageFormat: messageFormat,
          attachments:
            processedAttachments.length > 0 ? processedAttachments : undefined,
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    return {
      success: true,
      messageId: result.data._id,
    };
  } catch (error) {
    console.error("Error in email service:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}
