import { Response, NextFunction } from "express";
import { ResponseUtil } from "../utils/response.util";
import { UserRole, ERROR_MESSAGES } from "../config/constants";
import { AuthRequest } from "../types/common.types";

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!roles.includes(req.user.role)) {
      return ResponseUtil.forbidden(res, ERROR_MESSAGES.FORBIDDEN);
    }

    return next();
  };
};
