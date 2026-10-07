import mongoose, { Schema, Document } from "mongoose";

export interface IAssignmentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  smtpId: mongoose.Types.ObjectId;
  priority: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignmentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    smtpId: {
      type: Schema.Types.ObjectId,
      ref: "SmtpServer",
      required: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
assignmentSchema.index({ userId: 1, smtpId: 1 }, { unique: true });
assignmentSchema.index({ userId: 1, isPrimary: 1 });
assignmentSchema.index({ userId: 1, isActive: 1, priority: 1 });

// Ensure only one primary SMTP per user
assignmentSchema.pre("save", async function (next) {
  if (this.isPrimary && this.isModified("isPrimary")) {
    await mongoose
      .model("UserSmtpAssignment")
      .updateMany(
        { userId: this.userId, _id: { $ne: this._id } },
        { isPrimary: false }
      );
  }
  next();
});

export const UserSmtpAssignment = mongoose.model<IAssignmentDocument>(
  "UserSmtpAssignment",
  assignmentSchema
);
