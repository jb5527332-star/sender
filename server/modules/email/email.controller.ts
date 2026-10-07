import { Response } from 'express';
import { EmailService } from './email.service';
import { ResponseUtil } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/asyncHandler.util';
import { SUCCESS_MESSAGES } from '../../shared/config/constants';
import { AuthRequest } from '../../shared/types/common.types';
import mongoose from 'mongoose';
import { SmtpRotationService } from '../smtp/smtp-rotation.service';
import { SmtpServer } from '../user/smtp.model';

export class EmailController {
  private emailService: EmailService;
  private rotationService: SmtpRotationService;

  constructor() {
    this.emailService = new EmailService();
    this.rotationService = new SmtpRotationService();
  }

  sendEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const email = await this.emailService.sendEmail(req.user!._id, req.body);
    return ResponseUtil.created(res, email, SUCCESS_MESSAGES.EMAIL_QUEUED);
  });

  getMyEmails = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { emails, total, page, limit } =
      await this.emailService.getUserEmails(req.user!._id, req.query);
    return ResponseUtil.paginated(res, emails, total, page, limit);
  });

  getAllEmails = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { emails, total, page, limit } = await this.emailService.getAllEmails(
      req.query
    );
    return ResponseUtil.paginated(res, emails, total, page, limit);
  });

  getEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    const email = await this.emailService.getEmailById(req.params.id);
    return ResponseUtil.success(res, email);
  });

  getMyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.emailService.getEmailStats(req.user!._id);
    return ResponseUtil.success(res, stats);
  });

  getAllStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await this.emailService.getEmailStats();
    return ResponseUtil.success(res, stats);
  });

  getQueueStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await this.emailService.getQueueStats();
    return ResponseUtil.success(res, stats);
  });

  retryEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.emailService.retryFailedEmail(req.params.id);
    return ResponseUtil.success(res, null, 'Email queued for retry');
  });

  deleteEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.emailService.deleteEmail(req.params.id);
    return ResponseUtil.success(res, null, 'Email deleted successfully');
  });

  getDailyProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const progress = await this.emailService.getUserDailyProgress(
      new mongoose.Types.ObjectId(req.user!._id)
    );
    return ResponseUtil.success(res, progress);
  });

  getNextFromAddress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const smtp = await this.rotationService.selectSmtpForUser(req.user!._id);
    const server = await SmtpServer.findById(smtp._id);
    const fromEmail = server?.fromEmail || smtp.username;
    const fromName = server?.fromName;
    return ResponseUtil.success(res, { fromEmail, fromName });
  });
}
