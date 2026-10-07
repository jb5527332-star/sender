import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { envConfig } from "../config/env.config";
import { ResponseUtil } from "../utils/response.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { ERROR_MESSAGES } from "../config/constants";
import { AuthRequest, ITokenPayload } from "../types/common.types";
import { UserService } from "../../modules/user/user.service";

export class AuthMiddleware {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public authenticate = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      // Get token from header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
      }

      const token = authHeader.substring(7);

      try {
        // Verify token
        const decoded = jwt.verify(
          token,
          envConfig.jwt.secret,
        ) as ITokenPayload;

        // Get user from database
        const user = await this.userService.findById(decoded.userId);

        if (!user) {
          return ResponseUtil.unauthorized(res, ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if (!user.isActive) {
          return ResponseUtil.forbidden(res, ERROR_MESSAGES.USER_INACTIVE);
        }

        // Attach user to request
        req.user = user;
        return next();
      } catch (error: any) {
        if (error.name === "TokenExpiredError") {
          return ResponseUtil.unauthorized(res, ERROR_MESSAGES.TOKEN_EXPIRED);
        }
        return ResponseUtil.unauthorized(res, ERROR_MESSAGES.INVALID_TOKEN);
      }
    },
  );
}

export const authMiddleware = new AuthMiddleware();

export const authenticate = authMiddleware.authenticate;
