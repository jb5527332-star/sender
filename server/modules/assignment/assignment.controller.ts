import { Response } from "express";
import { AssignmentService } from "./assignment.service";
import { ResponseUtil } from "../../shared/utils/response.util";
import { asyncHandler } from "../../shared/utils/asyncHandler.util";
import { SUCCESS_MESSAGES } from "../../shared/config/constants";
import { AuthRequest } from "../../shared/types/common.types";

export class AssignmentController {
  private assignmentService: AssignmentService;

  constructor() {
    this.assignmentService = new AssignmentService();
  }

  createAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await this.assignmentService.create(req.body);
    return ResponseUtil.created(
      res,
      assignment,
      SUCCESS_MESSAGES.ASSIGNMENT_CREATED
    );
  });

  getUserAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignments = await this.assignmentService.getUserAssignments(
      req.params.userId
    );
    return ResponseUtil.success(res, assignments);
  });

  getMyAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignments = await this.assignmentService.getUserAssignments(
      req.user!._id
    );
    return ResponseUtil.success(res, assignments);
  });

  getSmtpAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignments = await this.assignmentService.getSmtpAssignments(
      req.params.smtpId
    );
    return ResponseUtil.success(res, assignments);
  });

  getAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await this.assignmentService.getAssignment(
      req.params.id
    );
    return ResponseUtil.success(res, assignment);
  });

  updateAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignment = await this.assignmentService.update(
      req.params.id,
      req.body
    );
    return ResponseUtil.success(
      res,
      assignment,
      SUCCESS_MESSAGES.ASSIGNMENT_UPDATED
    );
  });

  deleteAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.assignmentService.delete(req.params.id);
    return ResponseUtil.success(res, null, SUCCESS_MESSAGES.ASSIGNMENT_DELETED);
  });

  bulkAssign = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, smtpIds } = req.body;
    const assignments = await this.assignmentService.bulkAssign(
      userId,
      smtpIds
    );
    return ResponseUtil.created(
      res,
      assignments,
      SUCCESS_MESSAGES.ASSIGNMENT_CREATED
    );
  });
}
