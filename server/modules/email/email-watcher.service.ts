import { ChangeStream } from "mongodb";
import { emailQueueService } from "./email-queue.service";
import { EMAIL_STATUS } from "../../shared/config/constants";
import { logger } from "../../shared/services/logger.service";
import { EmailLog } from "../../modules/user/email.model";

export class EmailWatcherService {
  private changeStream: ChangeStream | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  start(): void {
    // Method 1: MongoDB Change Streams (watches for new emails)
    this.startChangeStream();

    // Method 2: Periodic check for stuck emails (backup)
    this.startPeriodicCheck();

    logger.info("Email watcher service started");
  }

  async stop(): Promise<void> {
    if (this.changeStream) {
      await this.changeStream.close();
      this.changeStream = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info("Email watcher service stopped");
  }

  private startChangeStream(): void {
    try {
      // Watch for updates to emails
      const pipeline = [
        {
          $match: {
            "fullDocument.status": EMAIL_STATUS.QUEUED,
            operationType: { $in: ["insert", "update"] },
          },
        },
      ];

      this.changeStream = EmailLog.watch(pipeline, {
        fullDocument: "updateLookup",
      });

      this.changeStream.on("change", async (change: any) => {
        if (change.fullDocument) {
          const email = change.fullDocument;
          const ageInMinutes =
            (Date.now() - new Date(email.createdAt).getTime()) / 60000;

          // Only process if email is older than 2 minutes (stuck)
          if (ageInMinutes > 2) {
            logger.warn(
              `Change stream detected stuck email ${
                email._id
              } (age: ${ageInMinutes.toFixed(1)} min)`
            );
            await emailQueueService.processEmail((email._id as any).toString());
          }
        }
      });

      this.changeStream.on("error", (error) => {
        logger.error("Change stream error:", error);
        // Attempt to restart
        setTimeout(() => this.startChangeStream(), 5000);
      });

      logger.info("Email change stream initialized");
    } catch (error) {
      logger.error("Failed to start change stream:", error);
      logger.info("Change streams may not be supported (requires replica set)");
    }
  }

  private startPeriodicCheck(): void {
    // Check every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.checkStuckEmails();
    }, 5 * 60 * 1000);

    // Run immediately on start
    this.checkStuckEmails();
  }

  private async checkStuckEmails(): Promise<void> {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      // Find emails stuck in queued or sending status
      const stuckEmails = await EmailLog.find({
        status: { $in: [EMAIL_STATUS.QUEUED, EMAIL_STATUS.SENDING] },
        createdAt: { $lt: twoMinutesAgo },
      }).limit(50);

      if (stuckEmails.length > 0) {
        logger.warn(`Found ${stuckEmails.length} stuck emails, processing...`);

        for (const email of stuckEmails) {
          await emailQueueService.processEmail((email._id as any).toString());
        }
      }
    } catch (error) {
      logger.error("Error checking stuck emails:", error);
    }
  }

  async processFailedEmails(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const failedEmails = await EmailLog.find({
        status: EMAIL_STATUS.FAILED,
        retryCount: { $lt: 3 },
        updatedAt: { $lt: oneHourAgo },
      }).limit(20);

      if (failedEmails.length > 0) {
        logger.info(`Retrying ${failedEmails.length} failed emails...`);

        for (const email of failedEmails) {
          // Reset retry count if it's been over an hour
          email.retryCount = 0;
          email.status = EMAIL_STATUS.QUEUED;
          await email.save();

          await emailQueueService.processEmail((email._id as any).toString());
        }
      }
    } catch (error) {
      logger.error("Error processing failed emails:", error);
    }
  }
}

export const emailWatcherService = new EmailWatcherService();
