import { Response } from "express";
import { AuthService } from "./auth.service";
import { ResponseUtil } from "../../shared/utils/response.util";
import { asyncHandler } from "../../shared/utils/asyncHandler.util";
import { SUCCESS_MESSAGES } from "../../shared/config/constants";
import { AuthRequest } from "../../shared/types/common.types";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  private getClientIP(req: AuthRequest): string {
  // Get IP from various possible headers
  const forwarded = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  const cloudflare = req.headers['cf-connecting-ip'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (typeof real === 'string') {
    return real;
  }
  if (typeof cloudflare === 'string') {
    return cloudflare;
  }
  
  return req.socket.remoteAddress || req.ip || 'Unknown';
}

  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.authService.register(req.body);
    return ResponseUtil.created(res, result, SUCCESS_MESSAGES.USER_CREATED);
  });

  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.authService.login(req.body);
    return ResponseUtil.success(res, result, SUCCESS_MESSAGES.LOGIN_SUCCESS);
  });

  refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.authService.refreshToken(req.body.refreshToken);
    return ResponseUtil.success(res, result, SUCCESS_MESSAGES.TOKEN_REFRESHED);
  });

  logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.authService.logout(req.user!._id);
    return ResponseUtil.success(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
  });

  me = asyncHandler(async (req: AuthRequest, res: Response) => {
    return ResponseUtil.success(res, req.user);
  });

  saveLocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ipAddress = this.getClientIP(req);
  
  // Merge IP address from server with location data from client
  const locationData = {
    ...req.body,
    ipAddress: ipAddress,
  };
  
  await this.authService.saveLocation(req.user!._id, locationData);
  return ResponseUtil.success(
    res,
    null,
    "Location saved successfully"
  );
});
}
