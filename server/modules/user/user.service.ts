import { User, IUserDocument } from "./user.model";
import { ICreateUserDTO, IUpdateUserDTO, IUserResponse } from "./user.types";
import { AppError } from "../../shared/middleware/error.middleware";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  UserRole,
} from "../../shared/config/constants";
import { IPaginationQuery } from "../../shared/types/common.types";

export class UserService {
  async create(data: ICreateUserDTO): Promise<IUserDocument> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const user = await User.create(data);
    return user;
  }

  async findById(userId: string): Promise<IUserResponse | null> {
    const user = await User.findById(userId);
    return user ? this.toUserResponse(user) : null;
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return await User.findOne({ email: normalizedEmail }).select("+password +refreshToken");
  }

  async findAll(query: IPaginationQuery): Promise<{
    users: IUserResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search = "",
    } = query;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Build search query
    const searchQuery: any = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(searchQuery).sort(sort).skip(skip).limit(limit),
      User.countDocuments(searchQuery),
    ]);

    return {
      users: users.map((user) => this.toUserResponse(user)),
      total,
      page,
      limit,
    };
  }

  async update(
    userId: string,
    data: IUpdateUserDTO
  ): Promise<IUserResponse | null> {
    const { password, ...rest } = data;

    if (password) {
      // Must use save() so the pre-save hook hashes the password
      const user = await User.findById(userId).select("+password");
      if (!user) {
        throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
      Object.assign(user, rest);
      user.password = password;
      await user.save();
      return this.toUserResponse(user);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: rest },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return this.toUserResponse(user);
  }

  async delete(userId: string): Promise<void> {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  }

  async resetDailyCounters(): Promise<void> {
    await User.updateMany(
      {},
      {
        $set: {
          emailsSentToday: 0,
          lastResetDate: new Date(),
        },
      }
    );
  }

  async getStats(userId: string): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return {
      emailsSentToday: user.emailsSentToday,
      dailyEmailLimit: user.dailyEmailLimit,
      remainingToday: user.dailyEmailLimit - user.emailsSentToday,
      totalEmailsSent: user.totalEmailsSent,
      percentageUsed: (
        (user.emailsSentToday / user.dailyEmailLimit) *
        100
      ).toFixed(2),
    };
  }

  private toUserResponse(user: IUserDocument): IUserResponse {
    return {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      smtpStrategy: user.smtpStrategy,
      isActive: user.isActive,
      dailyEmailLimit: user.dailyEmailLimit,
      emailsSentToday: user.emailsSentToday,
      totalEmailsSent: user.totalEmailsSent,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateLocation(
    userId: string,
    locationData: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      timestamp: Date;
      ipAddress?: string;
      city?: string;
      country?: string;
      hasGrantedPermission: boolean;
    }
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      location: locationData,
    });
  }

  async getAllUsersWithLocation(): Promise<
    Array<{
      _id: string;
      name: string;
      email: string;
      role: UserRole;
      isActive: boolean;
      lastLoginAt?: Date;
      location?: {
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
        timestamp: Date | null;
        ipAddress: string | null;
        city: string | null;
        country: string | null;
        hasGrantedPermission: boolean;
      };
    }>
  > {
    const users = await User.find({
      "location.hasGrantedPermission": true,
    }).select("name email role isActive lastLoginAt location");

    return users.map((user) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      location: {
        latitude: user.location?.latitude ?? null,
        longitude: user.location?.longitude ?? null,
        accuracy: user.location?.accuracy ?? null,
        timestamp: user.location?.timestamp ?? null,
        ipAddress: user.location?.ipAddress ?? null,
        city: user.location?.city ?? null,
        country: user.location?.country ?? null,
        hasGrantedPermission: user.location?.hasGrantedPermission ?? false,
      },
    }));
  }
}
