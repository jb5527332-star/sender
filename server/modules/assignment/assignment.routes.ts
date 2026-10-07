import { Router } from "express";
import { AssignmentController } from "./assignment.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { authorize } from "../../shared/middleware/role.middleware";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from "./assignment.validation";
import { ROLES } from "../../shared/config/constants";

const router = Router();
const assignmentController = new AssignmentController();

// Protect all routes
router.use(authenticate);

// User routes
router.get("/my", assignmentController.getMyAssignments);

// Admin routes
router.use(authorize(ROLES.ADMIN));

router.post(
  "/",
  validate(createAssignmentSchema),
  assignmentController.createAssignment
);
router.post("/bulk", assignmentController.bulkAssign);
router.get("/user/:userId", assignmentController.getUserAssignments);
router.get("/smtp/:smtpId", assignmentController.getSmtpAssignments);
router.get("/:id", assignmentController.getAssignment);
router.put(
  "/:id",
  validate(updateAssignmentSchema),
  assignmentController.updateAssignment
);
router.delete("/:id", assignmentController.deleteAssignment);

export default router;
