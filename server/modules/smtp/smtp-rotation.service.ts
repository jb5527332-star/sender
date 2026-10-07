import { User } from '../../modules/user/user.model';
import { AppError } from '../../shared/middleware/error.middleware';
import { ERROR_MESSAGES, HTTP_STATUS, SMTP_STRATEGY, SMTP_STATUS } from '../../shared/config/constants';
import { logger } from '../../shared/services/logger.service';
import { UserSmtpAssignment } from '../../modules/user/assignment.model';
import { ISmtpDocument, SmtpServer } from '../../modules/user/smtp.model';

export class SmtpRotationService {

  async selectSmtpForUser(userId: string): Promise<ISmtpDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`Selecting SMTP for user ${userId} with strategy: ${user.smtpStrategy}`);

    // Strategy 1: Dedicated SMTP
    if (user.smtpStrategy === SMTP_STRATEGY.DEDICATED) {
      return await this.selectDedicatedSmtp(userId);
    }

    // Strategy 2: Assigned SMTP (with fallback to shared pool)
    if (user.smtpStrategy === SMTP_STRATEGY.ASSIGNED) {
      return await this.selectAssignedSmtp(userId);
    }

    // Strategy 3: Shared Pool (Round-robin)
    return await this.selectFromSharedPool();
  }

  private async selectDedicatedSmtp(userId: string): Promise<ISmtpDocument> {
    // Get primary assignment
    const assignment = await UserSmtpAssignment.findOne({
      userId,
      isPrimary: true,
      isActive: true,
    }).populate<{ smtpId: ISmtpDocument }>('smtpId');

    if (!assignment || !assignment.smtpId) {
      logger.warn(`No dedicated SMTP found for user ${userId}, falling back to shared pool`);
      return await this.selectFromSharedPool();
    }

    const smtp = assignment.smtpId;

    // Check if SMTP can send
    if (smtp.canSendEmail() && smtp.availableToUsers) {
      logger.info(`Using dedicated SMTP: ${smtp.name} for user ${userId}`);
      return smtp;
    }

    // Fallback to other assigned SMTPs
    logger.warn(`Dedicated SMTP ${smtp.name} cannot send, trying other assignments`);
    return await this.selectAssignedSmtp(userId, true);
  }

  private async selectAssignedSmtp(
    userId: string,
    skipPrimary: boolean = false
  ): Promise<ISmtpDocument> {
    const query: any = {
      userId,
      isActive: true,
    };

    if (skipPrimary) {
      query.isPrimary = false;
    }

    const assignments = await UserSmtpAssignment.find(query)
      .populate<{ smtpId: ISmtpDocument }>('smtpId')
      .sort({ priority: 1 }); // Lower priority number = higher priority

    // Try each assigned SMTP in priority order
    for (const assignment of assignments) {
      const smtp = assignment.smtpId;
      if (smtp && smtp.canSendEmail() && smtp.availableToUsers) {
        logger.info(`Using assigned SMTP: ${smtp.name} (priority: ${assignment.priority}) for user ${userId}`);
        return smtp;
      }
    }

    // No assigned SMTP available, fallback to shared pool
    logger.warn(`No assigned SMTP available for user ${userId}, falling back to shared pool`);
    return await this.selectFromSharedPool();
  }

  private async selectFromSharedPool(): Promise<ISmtpDocument> {
    // Get all available SMTPs from shared pool
    const availableSmtps = await SmtpServer.find({
      isSharedPool: true,
      isActive: true,
      status: SMTP_STATUS.ACTIVE,
      availableToUsers: true,
    }).sort({ lastUsedAt: 1 }); // Sort by least recently used

    // Filter SMTPs that can send (check daily limit)
    const usableSmtps = availableSmtps.filter((smtp) => smtp.canSendEmail());

    if (usableSmtps.length === 0) {
      logger.error('No SMTP servers available in shared pool');
      throw new AppError(ERROR_MESSAGES.SMTP_UNAVAILABLE, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    // Select the least recently used SMTP (Round-robin)
    const selectedSmtp = usableSmtps[0];
    logger.info(`Selected SMTP from shared pool: ${selectedSmtp.name} (last used: ${selectedSmtp.lastUsedAt || 'never'})`);

    return selectedSmtp;
  }

  async selectSmtpLoadBalanced(): Promise<ISmtpDocument> {
    const availableSmtps = await SmtpServer.find({
      isSharedPool: true,
      isActive: true,
      status: SMTP_STATUS.ACTIVE,
    }).sort({ emailsSentToday: 1 }); // Sort by lowest usage

    const usableSmtps = availableSmtps.filter((smtp) => smtp.canSendEmail());

    if (usableSmtps.length === 0) {
      throw new AppError(ERROR_MESSAGES.SMTP_UNAVAILABLE, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    const selectedSmtp = usableSmtps[0];
    logger.info(`Load-balanced selection: ${selectedSmtp.name} (sent: ${selectedSmtp.emailsSentToday}/${selectedSmtp.dailyLimit})`);

    return selectedSmtp;
  }

  async getAvailableSmtpCount(userId?: string): Promise<{
    dedicated: number;
    assigned: number;
    sharedPool: number;
    total: number;
  }> {
    let dedicated = 0;
    let assigned = 0;

    if (userId) {
      // Count dedicated
      const dedicatedAssignment = await UserSmtpAssignment.countDocuments({
        userId,
        isPrimary: true,
        isActive: true,
      });
      dedicated = dedicatedAssignment;

      // Count assigned
      const assignedCount = await UserSmtpAssignment.countDocuments({
        userId,
        isActive: true,
      });
      assigned = assignedCount;
    }

    // Count shared pool
    const sharedPool = await SmtpServer.countDocuments({
      isSharedPool: true,
      isActive: true,
      status: SMTP_STATUS.ACTIVE,
      availableToUsers: true,
    });

    return {
      dedicated,
      assigned,
      sharedPool,
      total: dedicated + assigned + sharedPool,
    };
  }

  async getUsageStatistics(): Promise<any> {
    const smtps = await SmtpServer.find({ isActive: true });

    const stats = {
      totalSmtps: smtps.length,
      activeSmtps: smtps.filter((s) => s.status === SMTP_STATUS.ACTIVE).length,
      totalEmailsSent: smtps.reduce((sum, s) => sum + s.totalEmailsSent, 0),
      todayEmailsSent: smtps.reduce((sum, s) => sum + s.emailsSentToday, 0),
      totalCapacity: smtps.reduce((sum, s) => sum + s.dailyLimit, 0),
      remainingCapacity: smtps.reduce(
        (sum, s) => sum + (s.dailyLimit - s.emailsSentToday),
        0
      ),
      averageSuccessRate:
        smtps.reduce((sum, s) => sum + parseFloat(s.successRate.toString()), 0) /
        smtps.length,
      smtpDetails: smtps.map((s) => ({
        name: s.name,
        emailsSentToday: s.emailsSentToday,
        dailyLimit: s.dailyLimit,
        remainingToday: s.dailyLimit - s.emailsSentToday,
        successRate: s.successRate,
        status: s.status,
      })),
    };

    return stats;
  }
}