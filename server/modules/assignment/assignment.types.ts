export interface ICreateAssignmentDTO {
  userId: string;
  smtpId: string;
  priority?: number;
  isPrimary?: boolean;
}

export interface IUpdateAssignmentDTO {
  priority?: number;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface IAssignmentResponse {
  _id: string;
  userId: string;
  smtpId: string;
  priority: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}