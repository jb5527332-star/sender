import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  locationSchema,
} from "./auth.validation";

const router = Router();
const authController = new AuthController();

router.post(
  "/register",
  validate(registerSchema),
  authController.register
);

router.post("/login", validate(loginSchema), authController.login);

router.post(
  "/save-location",
  authenticate,
  validate(locationSchema),
  authController.saveLocation
);

router.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
