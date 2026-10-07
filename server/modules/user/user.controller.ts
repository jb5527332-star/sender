import { Response } from "express";
import { UserService } from "./user.service";
import { ResponseUtil } from "../../shared/utils/response.util";
import { asyncHandler } from "../../shared/utils/asyncHandler.util";
import { SUCCESS_MESSAGES } from "../../shared/config/constants";
import { AuthRequest } from "../../shared/types/common.types";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.userService.create(req.body);
    return ResponseUtil.created(res, user, SUCCESS_MESSAGES.USER_CREATED);
  });

  getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { users, total, page, limit } = await this.userService.findAll(
      req.query
    );
    return ResponseUtil.paginated(res, users, total, page, limit);
  });

  getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.userService.findById(req.params.id);
    return ResponseUtil.success(res, user);
  });

  updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.userService.update(req.params.id, req.body);
    return ResponseUtil.success(res, user, SUCCESS_MESSAGES.USER_UPDATED);
  });

  deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.userService.delete(req.params.id);
    return ResponseUtil.success(res, null, SUCCESS_MESSAGES.USER_DELETED);
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.userService.findById(req.user!._id);
    return ResponseUtil.success(res, user);
  });

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await this.userService.update(req.user!._id, req.body);
    return ResponseUtil.success(res, user, SUCCESS_MESSAGES.USER_UPDATED);
  });

  getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.userService.getStats(req.params.id);
    return ResponseUtil.success(res, stats);
  });

  getMyStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.userService.getStats(req.user!._id);
    return ResponseUtil.success(res, stats);
  });

   getUserLocations = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const users = await this.userService.getAllUsersWithLocation();
    return ResponseUtil.success(res, users);
  });
}
