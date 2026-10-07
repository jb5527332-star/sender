import { EventEmitter } from "events";
import nodemailer from "nodemailer";
import { SmtpRotationService } from "../../modules/smtp/smtp-rotation.service";
import { User } from "../../modules/user/user.model";
import { IEmailQueueData } from "./email.types";
import { EMAIL_STATUS, SMTP_STATUS } from "../../shared/config/constants";
import { logger } from "../../shared/services/logger.service";
import { AppError } from "../../shared/middleware/error.middleware";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../shared/config/constants";
import { EmailLog, IEmailDocument } from "../../modules/user/email.model";
import { SmtpServer } from "../../modules/user/smtp.model";

export class EmailQueueService extends EventEmitter {
  private smtpRotationService: SmtpRotationService;
  private processingEmails: Set<string> = new Set();

  constructor() {
    super();
    this.smtpRotationService = new SmtpRotationService();
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Listen for email:queued event
    this.on("email:queued", async (emailId: string) => {
      await this.processEmail(emailId);
    });

    // Listen for email:retry event
    this.on("email:retry", async (emailId: string) => {
      await this.processEmail(emailId);
    });

    logger.info("Email queue service initialized with event listeners");
  }

  async addToQueue(data: IEmailQueueData): Promise<IEmailDocument> {
    const user = await User.findById(data.userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (!user.canSendEmail()) {
      throw new AppError(
        ERROR_MESSAGES.DAILY_LIMIT_REACHED,
        HTTP_STATUS.TOO_MANY_REQUESTS,
      );
    }

    let processedAttachments: any[] = [];
    if (data.attachments && data.attachments.length > 0) {
      processedAttachments = data.attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content || "", "base64"),
        contentType: att.contentType,
      }));

      logger.info(
        `Processing ${processedAttachments.length} attachments for email`,
      );
    }

    // Create email log entry
    const email = await EmailLog.create({
      userId: data.userId,
      smtpId: data.smtpId,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      toEmail: data.toEmail,
      ccEmail: data.ccEmail,
      bccEmail: data.bccEmail,
      replyTo: data.replyTo,
      subject: data.subject,
      message: data.message,
      messagePreview: this.generatePreview(data.message),
      messageFormat: data.messageFormat || "html",
      priority: data.priority,
      status: EMAIL_STATUS.QUEUED,
      customHeaders: data.customHeaders,
      attachments: processedAttachments,
      attachmentCount: processedAttachments.length,
    });

    logger.info(
      `Email ${email._id} added to queue for user ${data.userId} with ${email.attachmentCount} attachments`,
    );

    // Trigger immediate processing via event
    setImmediate(() => {
      this.emit("email:queued", (email._id as any).toString());
    });

    return email;
  }

  async processEmail(emailId: string): Promise<void> {
    if (this.processingEmails.has(emailId)) {
      logger.warn(`Email ${emailId} is already being processed`);
      return;
    }

    this.processingEmails.add(emailId);

    try {
      const email = await EmailLog.findById(emailId);
      if (!email) {
        logger.error(`Email ${emailId} not found`);
        return;
      }

      if (
        [EMAIL_STATUS.SENT, EMAIL_STATUS.SENDING].includes(email.status as any)
      ) {
        logger.info(
          `Email ${emailId} already processed (status: ${email.status})`,
        );
        return;
      }

      logger.info(
        `Processing email ${emailId} (attempt ${email.retryCount + 1})`,
      );

      email.status = EMAIL_STATUS.SENDING;
      await email.save();

      let smtp;

      if (email.smtpId) {
        smtp = await SmtpServer.findById(email.smtpId);

        if (!smtp || !smtp.isActive || !smtp.canSendEmail()) {
          logger.warn(
            `Admin-selected SMTP ${email.smtpId} unavailable, using rotation`,
          );
          smtp = await this.smtpRotationService.selectSmtpForUser(
            email.userId.toString(),
          );
          email.smtpId = smtp._id;
          await email.save();
        } else {
          logger.info(`Using admin-selected SMTP: ${smtp.name}`);
        }
      } else {
        smtp = await this.smtpRotationService.selectSmtpForUser(
          email.userId.toString(),
        );
        email.smtpId = smtp._id;
        await email.save();
      }

      // Enforce system-decided From for non-admin users
      try {
        const user = await User.findById(email.userId);
        if (user && (user.role as any) !== "admin") {
          // PRESERVE the user's custom fromName - this is what they want to display
          const customFromName = email.fromName;

          // Override fromEmail with SMTP's email for deliverability
          if (smtp.fromEmail) {
            email.fromEmail = smtp.fromEmail as any;
          }

          // KEEP the custom fromName if user provided one, otherwise use SMTP default
          if (customFromName) {
            email.fromName = customFromName as any; // PRESERVE user's custom name including "uspto.gov"!
          } else if (smtp.fromName) {
            email.fromName = smtp.fromName as any;
          }

          if (!email.replyTo) {
            email.replyTo = email.fromEmail;
          }
          await email.save();

          logger.info(
            `Non-admin user: Preserved custom fromName="${customFromName}", using SMTP fromEmail=${smtp.fromEmail}`,
          );
        }
      } catch (_e) {}

      // Send email
      await this.sendEmail(email, smtp);

      // Update status to sent
      email.status = EMAIL_STATUS.SENT;
      email.sentAt = new Date();
      await email.save();

      // Update counters
      await smtp.incrementEmailCount(true);
      const user = await User.findById(email.userId);
      if (user) {
        await user.incrementEmailCount();
      }

      logger.info(`Email ${emailId} sent successfully via ${smtp.name}`);
    } catch (error: any) {
      logger.error(`Error processing email ${emailId}:`, error);
      await this.handleEmailFailure(emailId, error);
    } finally {
      this.processingEmails.delete(emailId);
    }
  }

  private async sendEmail(email: IEmailDocument, smtp: any): Promise<void> {
    const smtpConfig = smtp.getNodemailerConfig();

    // Add enhanced configuration for better deliverability
    smtpConfig.connectionTimeout = 30000;
    smtpConfig.greetingTimeout = 20000;
    smtpConfig.socketTimeout = 30000;

    logger.info(`SMTP connect attempt`, {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.auth?.user,
      attachments: email.attachmentCount,
    });

    let transporter = nodemailer.createTransport(smtpConfig);

    // Generate plain text version from HTML
    const plainText = email.message
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Helper function to properly format from/replyTo with name
    // Uses Nodemailer's address object format for better compatibility
    const formatEmailAddress = (
      name: string | undefined,
      email: string,
    ): { name: string; address: string } | string => {
      if (!name || name.trim() === "") {
        return email;
      }

      // Use Nodemailer's object format - handles ALL special characters correctly
      // including @ symbols in display names
      return {
        name: name,  // Nodemailer will handle escaping internally
        address: email,
      };
    };

    const mailOptions: any = {
      from: formatEmailAddress(email.fromName, email.fromEmail),
      replyTo: formatEmailAddress(email.fromName, email.fromEmail),
      to: email.toEmail,
      subject: email.subject,
      html: email.messageFormat === "html" ? email.message : undefined,
      text: email.messageFormat === "plain" ? email.message : plainText,
      attachments:
        email.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content, // This is already a Buffer
          contentType: att.contentType,
        })) || [],

      // Anti-spam headers
      headers: {
        "X-Mailer": "EmailHub Platform v1.0",
        "X-Original-Sender": email.fromName || email.fromEmail,
        "X-Entity-Ref-ID": email.id.toString(),
        "MIME-Version": "1.0",
        "X-Priority": email.priority === "high" ? "1" : "3",
        Importance: email.priority === "high" ? "high" : "normal",
        "X-MSMail-Priority": email.priority === "high" ? "High" : "Normal",
      },
    };

    // Conditionally add List-Unsubscribe when properly configured
    if (smtp.listUnsubscribeUrl) {
      mailOptions.headers["List-Unsubscribe"] = `<${smtp.listUnsubscribeUrl}>`;
      // One-Click applies to HTTP-based unsub endpoints
      mailOptions.headers["List-Unsubscribe-Post"] =
        "List-Unsubscribe=One-Click";
    } else if (smtp.listUnsubscribeEmail) {
      mailOptions.headers["List-Unsubscribe"] =
        `<mailto:${smtp.listUnsubscribeEmail}>`;
    }

    // Add DKIM signing if configured on SMTP
    if (
      smtp.dkimEnabled &&
      smtp.dkimDomain &&
      smtp.dkimSelector &&
      smtp.dkimPrivateKey
    ) {
      mailOptions.dkim = {
        domainName: smtp.dkimDomain,
        keySelector: smtp.dkimSelector,
        privateKey: smtp.dkimPrivateKey,
      };
    }

    // Add Reply-To if specified
    if (email.replyTo) {
      mailOptions.replyTo = email.replyTo;
    } else {
      // Always set reply-to to improve deliverability
      mailOptions.replyTo = email.fromEmail;
    }

    // Enforce domain alignment for Gmail/Hostinger SMTP: use SMTP username as From and set Reply-To
    try {
      const smtpDomain = (smtp.username || "").split("@")[1];
      const fromDomain = (email.fromEmail || "").split("@")[1];

      const isGmailSmtp =
        (smtp.host || "").includes("gmail") ||
        (smtpDomain || "").includes("gmail.com") ||
        (smtpDomain || "").includes("googlemail.com");

      const isHostingerSmtp =
        (smtp.host || "").includes("hostinger") ||
        (smtpDomain || "").includes("hostinger");

      // Apply domain alignment for Gmail, Hostinger, or any mismatched domains
      if (
        (isGmailSmtp || isHostingerSmtp) &&
        smtpDomain &&
        fromDomain &&
        smtpDomain !== fromDomain
      ) {
        // FIXED: Preserve the user's custom fromName exactly as provided
        // Only use fallback if no fromName is provided
        const displayName =
          email.fromName || (smtp.username || "").split("@")[0];

        // Use the custom fromName with smtp.username in angle brackets for SMTP compliance
        mailOptions.from = formatEmailAddress(displayName, smtp.username);
        mailOptions.replyTo = email.fromEmail;

        const provider = isGmailSmtp ? "Gmail" : isHostingerSmtp ? "Hostinger" : "SMTP";
        logger.info(
          `${provider} domain alignment: Using fromName="${displayName}", envelope from=${smtp.username}, replyTo=${email.fromEmail}`,
        );
      }
    } catch (_e) {}

    if (email.ccEmail) mailOptions.cc = email.ccEmail;
    if (email.bccEmail) mailOptions.bcc = email.bccEmail;

    // Set envelope to align bounce address with the sending identity.
    // The SMTP username is only usable as an envelope sender when it *is* an
    // email address. Relays like SMTPMaster issue opaque usernames
    // (e.g. "zevitechautomation20260730"), and using one as MAIL FROM gets
    // rejected with "550 5.7.1 A valid envelope sender is required".
    const isEmailAddress = (value: string | undefined): boolean =>
      !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    const envelopeFrom = isEmailAddress(smtp.username)
      ? smtp.username
      : isEmailAddress(smtp.fromEmail)
        ? smtp.fromEmail
        : email.fromEmail;

    if (isEmailAddress(envelopeFrom)) {
      // An explicit envelope bypasses Nodemailer's own recipient resolution,
      // so cc/bcc must be carried over or they are silently never delivered.
      mailOptions.envelope = {
        from: envelopeFrom,
        to: [email.toEmail, email.ccEmail, email.bccEmail].filter(Boolean),
      };
    }

    // Add custom headers if provided
    if (email.customHeaders) {
      email.customHeaders.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length > 0) {
          mailOptions.headers[key.trim()] = valueParts.join(":").trim();
        }
      });
    }

    // Log a warning for domain misalignment (DMARC risk)
    try {
      const fromDomain = (email.fromEmail || "").split("@")[1];
      const smtpUserDomain = (smtp.username || "").split("@")[1];
      if (fromDomain && smtpUserDomain && fromDomain !== smtpUserDomain) {
        logger.warn(
          `DMARC alignment risk: From domain ${fromDomain} differs from SMTP user domain ${smtpUserDomain}`,
        );
      }
    } catch (_err) {
      // ignore domain parsing errors
    }

    // Verify SMTP connection
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      logger.error("SMTP verify failed", {
        code: verifyError.code,
        message: verifyError.message,
      });

      const isConnError = [
        "ETIMEDOUT",
        "ECONNREFUSED",
        "ENOTFOUND",
        "ESOCKET",
      ].includes(verifyError?.code);

      let recovered = false;

      // Railway fix: If 587 fails, try 465
      if (isConnError && smtpConfig.port === 587) {
        const fallback = {
          ...smtpConfig,
          port: 465,
          secure: true,
          connectionTimeout: 30000,
          greetingTimeout: 20000,
          socketTimeout: 30000,
          tls: {
            rejectUnauthorized: true,
            minVersion: "TLSv1.2",
          },
        };
        logger.warn("Port 587 failed, retrying with 465 SSL (Railway fix)");
        const fallbackTransporter = nodemailer.createTransport(fallback);
        try {
          await fallbackTransporter.verify();
          logger.info("SMTP verify succeeded on 465 fallback");
          transporter = fallbackTransporter;
          recovered = true;
        } catch (fallbackError: any) {
          logger.error("SMTP verify failed on 465 fallback", {
            code: fallbackError.code,
            message: fallbackError.message,
          });
        }
      }

      if (!recovered) {
        throw verifyError;
      }
    }

    // Log the final From header being sent for debugging
    const fromDisplay = typeof mailOptions.from === 'object'
      ? `"${mailOptions.from.name}" <${mailOptions.from.address}>`
      : mailOptions.from;
    logger.info(
      `Sending email with From header: ${fromDisplay}, envelope from: ${
        mailOptions.envelope?.from ?? "(derived from From header)"
      }`,
    );

    const info = await transporter.sendMail(mailOptions);
    email.messageId = info.messageId;
    await email.save();
  }

  private async handleEmailFailure(emailId: string, error: any): Promise<void> {
    const email = await EmailLog.findById(emailId);
    if (!email) return;

    email.retryCount += 1;
    email.errorMessage = error.message;

    // Update SMTP failure count
    if (email.smtpId) {
      const smtp = await SmtpServer.findById(email.smtpId);
      if (smtp) {
        await smtp.incrementEmailCount(false);
        const msg = (error?.message || "").toLowerCase();
        const code = (error?.code || "").toString().toLowerCase();
        const rateLimitHit =
          msg.includes("quota") ||
          msg.includes("rate limit") ||
          msg.includes("daily limit") ||
          msg.includes("exceeded") ||
          code.includes("454") ||
          code.includes("421") ||
          code.includes("550 5.4.5") ||
          code.includes("452") ||
          code.includes("4.7.0");

        if (rateLimitHit) {
          smtp.status = SMTP_STATUS.RATE_LIMITED;
          smtp.lastError = error.message || "Rate limit reached";
          const resetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          smtp.rateLimitedUntil = resetAt;
          await smtp.save();
        } else {
          smtp.lastError = error.message || smtp.lastError;
          await smtp.save();
        }
      }
    }

    if (email.retryCount < email.maxRetries) {
      // Schedule retry with exponential backoff
      const delayMs = Math.pow(2, email.retryCount) * 60000; // 2, 4, 8 minutes
      email.status = EMAIL_STATUS.RETRYING;
      await email.save();

      logger.warn(
        `Email ${emailId} failed, scheduling retry ${email.retryCount}/${
          email.maxRetries
        } in ${delayMs / 1000}s`,
      );

      setTimeout(() => {
        this.emit("email:retry", emailId);
      }, delayMs);
    } else {
      // Max retries reached
      email.status = EMAIL_STATUS.FAILED;
      await email.save();
      logger.error(
        `Email ${emailId} failed permanently after ${email.maxRetries} attempts`,
      );
    }
  }

  private generatePreview(message: string): string {
    const text = message.replace(/<[^>]*>/g, ""); // Strip HTML
    return text.substring(0, 500);
  }

  async getQueueStats(): Promise<any> {
    const [queued, sending, sent, failed, retrying] = await Promise.all([
      EmailLog.countDocuments({ status: EMAIL_STATUS.QUEUED }),
      EmailLog.countDocuments({ status: EMAIL_STATUS.SENDING }),
      EmailLog.countDocuments({ status: EMAIL_STATUS.SENT }),
      EmailLog.countDocuments({ status: EMAIL_STATUS.FAILED }),
      EmailLog.countDocuments({ status: EMAIL_STATUS.RETRYING }),
    ]);

    return {
      queued,
      sending,
      sent,
      failed,
      retrying,
      total: queued + sending + sent + failed + retrying,
      processing: this.processingEmails.size,
    };
  }
}

export const emailQueueService = new EmailQueueService();
