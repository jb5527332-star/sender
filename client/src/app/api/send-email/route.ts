import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { SpamBypassAnalyzer } from "@/utils/spam-bypass";

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configure SMTP transport with enhanced settings for deliverability
const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
    ciphers: "SSLv3", // Use secure ciphers
  },
  // Enhanced connection settings for better deliverability
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  // Enable DKIM if available
  dkim: process.env.DKIM_PRIVATE_KEY
    ? {
        domainName:
          process.env.DKIM_DOMAIN ||
          process.env.SMTP_USER?.split("@")[1] ||
          "gmail.com",
        keySelector: process.env.DKIM_SELECTOR || "default",
        privateKey: process.env.DKIM_PRIVATE_KEY,
      }
    : undefined,
};

// Validate SMTP configuration
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error(
    "SMTP configuration missing. Please check your .env.local file."
  );
}

// Rate limiting function
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10; // Max 10 emails per 15 minutes per IP

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

// Email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Create temp directory for attachments if it doesn't exist
const createTempDir = async () => {
  // Use system temp directory for production (Vercel compatible)
  // In development, use the project temp directory for easier debugging
  const tempDir = process.env.NODE_ENV === 'production' 
    ? tmpdir() 
    : join(process.cwd(), "temp");
  
  // Only create directory if it's not the system temp directory and doesn't exist
  if (process.env.NODE_ENV !== 'production' && !existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }
  return tempDir;
};

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Check rate limiting
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );
    }

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport(smtpConfig);

    // Process form data
    const formData = await request.formData();

    // Extract form fields
    const fromName = formData.get("fromName") as string;
    const fromEmail = formData.get("fromEmail") as string;
    const toEmail = formData.get("toEmail") as string;
    const ccEmail = formData.get("ccEmail") as string;
    const bccEmail = formData.get("bccEmail") as string;
    const replyTo = formData.get("replyTo") as string;
    const subject = formData.get("subject") as string;
    const priority = formData.get("priority") as string;
    const tagline = formData.get("tagline") as string;
    let message = formData.get("message") as string;
    const messageFormat = formData.get("messageFormat") as string;
    const customHeaders = formData.get("customHeaders") as string;
    const attachmentFiles = formData.getAll("attachments") as File[];

    // Server-side content sanitization to remove base64 encoded data
    if (message) {
      // Remove base64 encoded images
      message = message.replace(
        /<img[^>]*src="data:image\/[^"]*"[^>]*>/gi,
        '<p style="color: #666; font-style: italic; border: 1px dashed #ccc; padding: 10px; margin: 10px 0;">[Image removed - Please use the attachment uploader to add images]</p>'
      );

      // Remove any other base64 encoded content
      message = message.replace(
        /data:[^;]+;base64,[A-Za-z0-9+/=]+/g,
        '[Base64 content removed - Please use the attachment uploader]'
      );

      // Remove extremely long strings that might be encoded data (over 200 characters)
      message = message.replace(
        /[A-Za-z0-9+/=]{200,}/g,
        '[Large encoded content removed - Please use the attachment uploader]'
      );
    }

    // Validate required fields
    if (!fromEmail || !toEmail || !subject || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email formats
    if (!isValidEmail(fromEmail) || !isValidEmail(toEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Smart spam analysis with suggestions (non-blocking)
    const spamAnalysis = SpamBypassAnalyzer.analyzeContent(
      subject + " " + message
    );

    // Log spam analysis for monitoring but don't block
    if (spamAnalysis.score > 20) {
      console.warn("Potential spam detected:", {
        isSpam: spamAnalysis.isSpam,
        score: spamAnalysis.score,
        reasons: spamAnalysis.reasons,
      });
    }

    // Only block if score is extremely high (>60) to prevent obvious spam
    if (spamAnalysis.score > 60) {
      return NextResponse.json(
        {
          success: false,
          error: "Content requires optimization before sending",
          spamAnalysis: {
            score: spamAnalysis.score,
            reasons: spamAnalysis.reasons,
            suggestions: spamAnalysis.suggestions.slice(0, 3), // Limit suggestions
          },
        },
        { status: 400 }
      );
    }

    // Enhanced email headers for better deliverability and authentication
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhancedHeaders: any = {
      // Authentication and reputation headers
      "X-Original-From": fromEmail,
      "X-Mailer": "Microsoft Outlook 16.0",
      "X-Originating-IP": "[192.168.1.1]",

      // Priority headers
      "X-Priority": priority === "high" ? "1" : priority === "low" ? "5" : "3",
      "X-MSMail-Priority":
        priority === "high" ? "High" : priority === "low" ? "Low" : "Normal",
      Importance:
        priority === "high" ? "High" : priority === "low" ? "Low" : "Normal",

      // Message identification
      "Message-ID": `<${randomUUID()}@${fromEmail.split("@")[1]}>`,
      Date: new Date().toUTCString(),

      // Anti-spam headers
      "X-Spam-Status": "No",
      "X-Spam-Score": "0.0",
      "X-Spam-Level": "",
      "X-Spam-Checker-Version": "SpamAssassin 3.4.0",

      // IMPORTANT: Do NOT set MIME/Content headers manually; let Nodemailer compute them
      // This prevents raw MIME parts from appearing in the email body when attachments are present

      // Delivery and routing headers
      "X-Auto-Response-Suppress": "DR, RN, NRN, OOF, AutoReply",
      "X-MS-Has-Attach": attachmentFiles.length > 0 ? "yes" : "no",
      "X-MS-TNEF-Correlator": "",

      // List management headers (helps with deliverability)
      "List-Unsubscribe": `<mailto:unsubscribe@${
        process.env.SMTP_USER?.split("@")[1] || "gmail.com"
      }>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",

      // Feedback loop headers
      "Feedback-ID": `${randomUUID()}:${
        process.env.SMTP_USER?.split("@")[1] || "gmail.com"
      }`,

      // Security headers
      "X-Virus-Scanned": "Clean",
      "X-Spam-Flag": "NO",
    };

    // Set up email data - using the authenticated email as the actual sender but displaying the custom From address
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mailOptions: any = {
      from: `"${fromName || fromEmail}" <${
        process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
      }>`,
      to: toEmail,
      subject: subject,
      replyTo: replyTo || fromEmail, // Set reply-to as the provided reply-to or the spoofed address
      headers: enhancedHeaders,
    };

    // Add CC if provided
    if (ccEmail && ccEmail.trim() !== "") {
      mailOptions.cc = ccEmail;
    }

    // Add BCC if provided
    if (bccEmail && bccEmail.trim() !== "") {
      mailOptions.bcc = bccEmail;
    }

    // Add priority if provided
    if (priority && priority !== "normal") {
      mailOptions.priority = priority;
    }

    // Add tagline/preview text if provided
    if (tagline && tagline.trim() !== "") {
      mailOptions.headers["X-Preview"] = tagline;
      // For some email clients that use first line of text as preview
      if (messageFormat === "plain") {
        mailOptions.text = tagline + "\n\n" + message;
      }
    } else if (messageFormat === "plain") {
      mailOptions.text = message;
    }

    // Set message format (HTML or plain text)
    if (messageFormat === "html") {
      mailOptions.html = message;
    } else {
      mailOptions.text = message;
    }

    // Process custom headers if provided
    if (customHeaders && customHeaders.trim() !== "") {
      const forbiddenHeaderPrefixes = ["content-", "mime-"]; // lowercase compare
      const forbiddenHeaderNames = new Set([
        "content-type",
        "content-transfer-encoding",
        "mime-version",
        "content-disposition",
        "boundary",
      ]);

      const headerLines = customHeaders.split("\n");
      headerLines.forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const keyRaw = parts[0].trim();
          const key = keyRaw.toLowerCase();
          const value = parts.slice(1).join(":").trim();

          // Skip any forbidden or dangerous headers
          const blocked =
            forbiddenHeaderNames.has(key) ||
            forbiddenHeaderPrefixes.some((p) => key.startsWith(p));
          if (!blocked && key && value) {
            mailOptions.headers[keyRaw] = value;
          }
        }
      });
    }

    // Process attachments if any
    if (attachmentFiles.length > 0) {
      const tempDir = await createTempDir();

      mailOptions.attachments = await Promise.all(
        attachmentFiles.map(async (file) => {
          const fileName = `${randomUUID()}-${file.name}`;
          const filePath = join(tempDir, fileName);

          const buffer = Buffer.from(await file.arrayBuffer());
          await writeFile(filePath, buffer);

          // Check if it's a calendar invitation
          const isCalendarInvite = file.name.toLowerCase().endsWith(".ics");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const attachment: any = {
            filename: file.name,
            path: filePath,
          };

          // If it's a calendar invite, set appropriate content type and method
          if (isCalendarInvite) {
            attachment.contentType =
              "text/calendar; charset=utf-8; method=REQUEST";
            attachment.contentDisposition = "attachment";
          }

          return attachment;
        })
      );
    }

    console.log(
      "Sending email with options:",
      JSON.stringify(mailOptions, null, 2)
    );

    // Add artificial delay to mimic email processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const info = await transporter.sendMail(mailOptions);
    // console.log("Message sent: %s", info.messageId);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      details: info,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
