import { User } from '../../modules/user/user.model';
import { ICreateAssignmentDTO, IUpdateAssignmentDTO } from './assignment.types';
import { AppError } from '../../shared/middleware/error.middleware';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../shared/config/constants';
import { SmtpServer } from '../../modules/user/smtp.model';
import { IAssignmentDocument, UserSmtpAssignment } from '../../modules/user/assignment.model';

export class AssignmentService {
    
  async create(data: ICreateAssignmentDTO): Promise<IAssignmentDocument> {
    // Verify user exists
    const user = await User.findById(data.userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Verify SMTP exists
    const smtp = await SmtpServer.findById(data.smtpId);
    if (!smtp) {
      throw new AppError(ERROR_MESSAGES.SMTP_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Check if assignment already exists
    const existing = await UserSmtpAssignment.findOne({
      userId: data.userId,
      smtpId: data.smtpId,
    });

    if (existing) {
      throw new AppError(
        ERROR_MESSAGES.ASSIGNMENT_EXISTS,
        HTTP_STATUS.CONFLICT
      );
    }

    const assignment = await UserSmtpAssignment.create(data);
    return assignment;
  }

  async getUserAssignments(userId: string): Promise<IAssignmentDocument[]> {
    return await UserSmtpAssignment.find({ userId })
      .populate('smtpId', 'name host fromEmail dailyLimit emailsSentToday status')
      .sort({ priority: 1 });
  }

  async getSmtpAssignments(smtpId: string): Promise<IAssignmentDocument[]> {
    return await UserSmtpAssignment.find({ smtpId })
      .populate('userId', 'email name')
      .sort({ priority: 1 });
  }

  async getAssignment(assignmentId: string): Promise<IAssignmentDocument | null> {
    return await UserSmtpAssignment.findById(assignmentId)
      .populate('userId', 'email name')
      .populate('smtpId', 'name host fromEmail');
  }

  async update(
    assignmentId: string,
    data: IUpdateAssignmentDTO
  ): Promise<IAssignmentDocument | null> {
    const assignment = await UserSmtpAssignment.findByIdAndUpdate(
      assignmentId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!assignment) {
      throw new AppError(
        ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }

    return assignment;
  }

  async delete(assignmentId: string): Promise<void> {
    const assignment = await UserSmtpAssignment.findByIdAndDelete(assignmentId);
    if (!assignment) {
      throw new AppError(
        ERROR_MESSAGES.ASSIGNMENT_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND
      );
    }
  }

  async deleteUserAssignments(userId: string): Promise<void> {
    await UserSmtpAssignment.deleteMany({ userId });
  }

  async deleteSmtpAssignments(smtpId: string): Promise<void> {
    await UserSmtpAssignment.deleteMany({ smtpId });
  }

  async bulkAssign(
    userId: string,
    smtpIds: string[]
  ): Promise<IAssignmentDocument[]> {
    const assignments: IAssignmentDocument[] = [];

    for (let i = 0; i < smtpIds.length; i++) {
      const assignment = await this.create({
        userId,
        smtpId: smtpIds[i],
        priority: i + 1,
        isPrimary: i === 0,
      });
      assignments.push(assignment);
    }

    return assignments;
  }
}