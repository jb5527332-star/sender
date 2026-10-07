import { EmailLog, IEmailDocument } from '../../modules/user/email.model';
  import { emailQueueService } from './email-queue.service';
  import { ISendEmailDTO } from './email.types';
  import { EMAIL_STATUS } from '../../shared/config/constants';
  import { IPaginationQuery } from '../../shared/types/common.types';
import { AppError } from '@shared/middleware/error.middleware';
import mongoose from 'mongoose';
import { User } from '@modules/user/user.model';

  export class EmailService {
      
    async sendEmail(userId: string, data: ISendEmailDTO): Promise<IEmailDocument> {
      return await emailQueueService.addToQueue({
        userId,
        ...data,
      });
    }

    async getEmailById(emailId: string): Promise<IEmailDocument | null> {
      return await EmailLog.findById(emailId)
        .populate('userId', 'email  emailsSentToday dailyEmailLimit')
        .populate('smtpId', 'name host fromEmail');
    }

    async getUserEmails(
      userId: string,
      query: IPaginationQuery
    ): Promise<{
      emails: IEmailDocument[];
      total: number;
      page: number;
      limit: number;
    }> {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
      } = query;

      const skip = (page - 1) * limit;
      const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const searchQuery: any = { userId };
      if (search) {
        searchQuery.$or = [
          { toEmail: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
        ];
      }

      const [emails, total] = await Promise.all([
        EmailLog.find(searchQuery)
          .populate('userId', 'email name emailsSentToday dailyEmailLimit')
          .populate('smtpId', 'name host fromEmail')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        EmailLog.countDocuments(searchQuery),
      ]);

      return { emails, total, page, limit };
    }

    async getAllEmails(query: IPaginationQuery): Promise<{
      emails: IEmailDocument[];
      total: number;
      page: number;
      limit: number;
    }> {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
      } = query;

      const skip = (page - 1) * limit;
      const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const searchQuery: any = {};
      if (search) {
        searchQuery.$or = [
          { toEmail: { $regex: search, $options: 'i' } },
          { fromEmail: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
        ];
      }

      const [emails, total] = await Promise.all([
        EmailLog.find(searchQuery)
          .populate('userId', 'email name')
          .populate('smtpId', 'name host fromEmail emailsSentToday dailyEmailLimit')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        EmailLog.countDocuments(searchQuery),
      ]);

      return { emails, total, page, limit };
    }

    async getEmailStats(userId?: string): Promise<any> {
      const query = userId ? { userId } : {};

      const [total, sent, failed, queued, today] = await Promise.all([
        EmailLog.countDocuments(query),
        EmailLog.countDocuments({ ...query, status: EMAIL_STATUS.SENT }),
        EmailLog.countDocuments({ ...query, status: EMAIL_STATUS.FAILED }),
        EmailLog.countDocuments({ ...query, status: EMAIL_STATUS.QUEUED }),
        EmailLog.countDocuments({
          ...query,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
      ]);

      const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : '0';

      return {
        total,
        sent,
        failed,
        queued,
        today,
        successRate,
      };
    }

    async getQueueStats(): Promise<any> {
      return await emailQueueService.getQueueStats();
    }

    async retryFailedEmail(emailId: string): Promise<void> {
      const email = await EmailLog.findById(emailId);
      if (!email) {
        throw new Error('Email not found');
      }

      email.status = EMAIL_STATUS.QUEUED;
      email.retryCount = 0;
      email.errorMessage = undefined;
      await email.save();

      await emailQueueService.processEmail(emailId);
    }

    async deleteEmail(emailId: string): Promise<void> {
    const email = await EmailLog.findById(emailId);
    if (!email) {
      throw new AppError('Email not found', 404);
    }

    await EmailLog.findByIdAndDelete(emailId);
  }

  async getUserDailyProgress(userId: mongoose.Types.ObjectId): Promise<{
    emailsSentToday: number;
    dailyEmailLimit: number;
    remainingEmails: number;
    progressPercentage: number;
    canSendMore: boolean;
    resetTime: Date;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Ensure daily counter is reset if needed
    user.checkAndResetDailyCounter();
    await user.save();

    const remainingEmails = Math.max(0, user.dailyEmailLimit - user.emailsSentToday);
    const progressPercentage = user.dailyEmailLimit > 0 
      ? Math.round((user.emailsSentToday / user.dailyEmailLimit) * 100)
      : 0;

    // Calculate next reset time (tomorrow at midnight)
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    return {
      emailsSentToday: user.emailsSentToday,
      dailyEmailLimit: user.dailyEmailLimit,
      remainingEmails,
      progressPercentage,
      canSendMore: user.canSendEmail(),
      resetTime,
    };
  }
  
}