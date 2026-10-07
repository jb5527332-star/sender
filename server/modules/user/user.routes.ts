import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { authorize } from "../../shared/middleware/role.middleware";
import { validate, validateQuery } from "../../shared/middleware/validation.middleware";
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
} from "./user.validation";
import { ROLES } from "../../shared/config/constants";

const router = Router();
const userController = new UserController();

// Protect all routes
router.use(authenticate);

// User profile routes (accessible by all authenticated users)
router.get("/profile", userController.getProfile);
router.put(
  "/profile",
  validate(updateUserSchema),
  userController.updateProfile
);
router.get("/stats/me", userController.getMyStats);

// Admin only routes
router.use(authorize(ROLES.ADMIN));

router.post("/", validate(createUserSchema), userController.createUser);
router.get("/", validateQuery(paginationSchema), userController.getUsers);
router.get("/locations/all", userController.getUserLocations);
router.get("/:id", userController.getUser);
router.put("/:id", validate(updateUserSchema), userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.get("/:id/stats", userController.getUserStats);

export default router;
