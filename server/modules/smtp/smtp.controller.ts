import { Response } from "express";
import { SmtpService } from "./smtp.service";
import { SmtpRotationService } from "./smtp-rotation.service";
import { ResponseUtil } from "../../shared/utils/response.util";
import { asyncHandler } from "../../shared/utils/asyncHandler.util";
import { SUCCESS_MESSAGES } from "../../shared/config/constants";
import { AuthRequest } from "../../shared/types/common.types";

export class SmtpController {
  private smtpService: SmtpService;
  private rotationService: SmtpRotationService;

  constructor() {
    this.smtpService = new SmtpService();
    this.rotationService = new SmtpRotationService();
  }

  createSmtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const smtp = await this.smtpService.create(req.body);
    return ResponseUtil.created(res, smtp, SUCCESS_MESSAGES.SMTP_CREATED);
  });

  getSmtps = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { smtps, total, page, limit } = await this.smtpService.findAll(
      req.query
    );
    return ResponseUtil.paginated(res, smtps, total, page, limit);
  });

  getSmtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const smtp = await this.smtpService.findById(req.params.id);
    return ResponseUtil.success(res, smtp);
  });

  updateSmtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    const smtp = await this.smtpService.update(req.params.id, req.body);
    return ResponseUtil.success(res, smtp, SUCCESS_MESSAGES.SMTP_UPDATED);
  });

  deleteSmtp = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.smtpService.delete(req.params.id);
    return ResponseUtil.success(res, null, SUCCESS_MESSAGES.SMTP_DELETED);
  });

  getSmtpStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.smtpService.getStats(req.params.id);
    return ResponseUtil.success(res, stats);
  });

  testConnection = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.smtpService.testConnection(req.params.id);
    return ResponseUtil.success(res, result);
  });

  getUsageStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await this.rotationService.getUsageStatistics();
    return ResponseUtil.success(res, stats);
  });

  getAvailableCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.query.userId as string;
    const count = await this.rotationService.getAvailableSmtpCount(userId);
    return ResponseUtil.success(res, count);
  });

  getAvailableSmtps = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const smtps = await this.smtpService.getAvailableSmtps();
  return ResponseUtil.success(res, smtps);
});
}
