import { ICreateSmtpDTO, IUpdateSmtpDTO, ISmtpResponse } from "./smtp.types";
import { AppError } from "../../shared/middleware/error.middleware";
import { ERROR_MESSAGES, HTTP_STATUS, SMTP_STATUS } from "../../shared/config/constants";
import { IPaginationQuery } from "../../shared/types/common.types";
import { ISmtpDocument, SmtpServer } from "../../modules/user/smtp.model";
import nodemailer from "nodemailer";
import logger from "../../shared/services/logger.service";

export class SmtpService {
  async create(data: ICreateSmtpDTO): Promise<ISmtpDocument> {
    const smtp = await SmtpServer.create(data);
    return smtp;
  }

  async findById(smtpId: string): Promise<ISmtpResponse | null> {
    const smtp = await SmtpServer.findById(smtpId);
    return smtp ? this.toSmtpResponse(smtp) : null;
  }

  async findAll(query: IPaginationQuery): Promise<{
    smtps: ISmtpResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search = "",
    } = query;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const searchQuery: any = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { host: { $regex: search, $options: "i" } },
        { fromEmail: { $regex: search, $options: "i" } },
      ];
    }

    const [smtps, total] = await Promise.all([
      SmtpServer.find(searchQuery).sort(sort).skip(skip).limit(limit),
      SmtpServer.countDocuments(searchQuery),
    ]);

    return {
      smtps: smtps.map((smtp) => this.toSmtpResponse(smtp)),
      total,
      page,
      limit,
    };
  }

  async update(
    smtpId: string,
    data: IUpdateSmtpDTO
  ): Promise<ISmtpResponse | null> {
    const smtp = await SmtpServer.findByIdAndUpdate(
      smtpId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!smtp) {
      throw new AppError(ERROR_MESSAGES.SMTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return this.toSmtpResponse(smtp);
  }

  async delete(smtpId: string): Promise<void> {
    const smtp = await SmtpServer.findByIdAndDelete(smtpId);
    if (!smtp) {
      throw new AppError(ERROR_MESSAGES.SMTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
  }

  async resetDailyCounters(): Promise<void> {
    await SmtpServer.updateMany(
      {},
      {
        $set: {
          emailsSentToday: 0,
          lastResetDate: new Date(),
          status: SMTP_STATUS.ACTIVE,
          rateLimitedUntil: null,
        },
      }
    );
  }

  async getStats(smtpId: string): Promise<any> {
    const smtp = await SmtpServer.findById(smtpId);
    if (!smtp) {
      throw new AppError(ERROR_MESSAGES.SMTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return {
      emailsSentToday: smtp.emailsSentToday,
      dailyLimit: smtp.dailyLimit,
      remainingToday: smtp.dailyLimit - smtp.emailsSentToday,
      totalEmailsSent: smtp.totalEmailsSent,
      successCount: smtp.successCount,
      failureCount: smtp.failureCount,
      successRate: smtp.successRate,
      percentageUsed: ((smtp.emailsSentToday / smtp.dailyLimit) * 100).toFixed(
        2
      ),
    };
  }

  async testConnection(
    smtpId: string
  ): Promise<{ success: boolean; message: string }> {
    const smtp = await SmtpServer.findById(smtpId);
    if (!smtp) {
      throw new AppError(ERROR_MESSAGES.SMTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    try {
      const config = smtp.getNodemailerConfig();

      // Add Railway-specific timeouts
      config.connectionTimeout = 30000;
      config.greetingTimeout = 20000;
      config.socketTimeout = 30000;

      const transporter = nodemailer.createTransport(config);

      try {
        await transporter.verify();

        smtp.lastHealthCheckAt = new Date();
        smtp.healthCheckStatus = "healthy";
        await smtp.save();

        return { success: true, message: "Connection successful" };
      } catch (primaryError: any) {
        // Railway fix: If 587 fails, try 465
        if (
          config.port === 587 &&
          ["ETIMEDOUT", "ESOCKET", "ECONNREFUSED"].includes(primaryError?.code)
        ) {
          logger.warn("Port 587 failed, trying 465 SSL");

          const fallbackConfig = {
            ...config,
            port: 465,
            secure: true,
            connectionTimeout: 30000,
            greetingTimeout: 20000,
            socketTimeout: 30000,
            tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
          };

          const fallbackTransporter =
            nodemailer.createTransport(fallbackConfig);
          await fallbackTransporter.verify();

          smtp.lastHealthCheckAt = new Date();
          smtp.healthCheckStatus = "healthy";
          await smtp.save();

          return {
            success: true,
            message:
              "Connection successful via port 465 SSL (Railway fallback)",
          };
        }

        throw primaryError;
      }
    } catch (error: any) {
      smtp.lastHealthCheckAt = new Date();
      smtp.healthCheckStatus = "unhealthy";
      await smtp.save();

      logger.error(`SMTP test failed for ${smtp.name}:`, error);

      return {
        success: false,
        message: error.message || "Connection failed",
      };
    }
  }

  private toSmtpResponse(smtp: ISmtpDocument): ISmtpResponse {
    return {
      _id: smtp._id.toString(),
      name: smtp.name,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      username: smtp.username,
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName,
      dkimEnabled: smtp.dkimEnabled,
      dkimDomain: smtp.dkimDomain,
      dkimSelector: smtp.dkimSelector,
      listUnsubscribeEmail: smtp.listUnsubscribeEmail,
      listUnsubscribeUrl: smtp.listUnsubscribeUrl,
      dailyLimit: smtp.dailyLimit,
      emailsSentToday: smtp.emailsSentToday,
      totalEmailsSent: smtp.totalEmailsSent,
      successCount: smtp.successCount,
      failureCount: smtp.failureCount,
      successRate: smtp.successRate,
      isActive: smtp.isActive,
      status: smtp.status,
      priority: smtp.priority,
      isSharedPool: smtp.isSharedPool,
      availableToUsers: smtp.availableToUsers,
      rateLimitedUntil: smtp.rateLimitedUntil,
      lastError: smtp.lastError,
      createdAt: smtp.createdAt,
      updatedAt: smtp.updatedAt,
    };
  }

  async getAvailableSmtps(): Promise<ISmtpResponse[]> {
    const smtps = await SmtpServer.find({
      isActive: true,
      status: SMTP_STATUS.ACTIVE,
      availableToUsers: true,
    }).sort({ name: 1 });

    return smtps.map((smtp) => this.toSmtpResponse(smtp));
  }
}
