import jwt from "jsonwebtoken";
import { UserService } from "../../modules/user/user.service";
import { ILoginDTO, IRegisterDTO, IAuthResponse, ILocationDTO } from "./auth.types";
import { envConfig } from "../../shared/config/env.config";
import { AppError } from "../../shared/middleware/error.middleware";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  ROLES,
  UserRole,
} from "../../shared/config/constants";
import { ITokenPayload } from "../../shared/types/common.types";

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async register(data: IRegisterDTO): Promise<IAuthResponse> {
    // For first user, make them admin
    const userCount = await this.getUserCount();
    const role = userCount === 0 ? ROLES.ADMIN : ROLES.USER;

    const user = await this.userService.create({
      ...data,
      role,
    });

    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    await this.userService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken
    );

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(data: ILoginDTO): Promise<IAuthResponse> {
    const user = await this.userService.findByEmail(data.email);

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    if (!user.isActive) {
      throw new AppError(ERROR_MESSAGES.USER_INACTIVE, HTTP_STATUS.FORBIDDEN);
    }

    const isPasswordValid = await user.comparePassword(data.password);

    if (!isPasswordValid) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    await this.userService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken
    );
    await this.userService.updateLastLogin(user._id.toString());

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        envConfig.jwt.refreshSecret
      ) as ITokenPayload;

      const user = await this.userService.findByEmail(decoded.email);

      if (!user || user.refreshToken !== refreshToken) {
        throw new AppError(
          ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      if (!user.isActive) {
        throw new AppError(ERROR_MESSAGES.USER_INACTIVE, HTTP_STATUS.FORBIDDEN);
      }

      const tokens = this.generateTokens(
        user._id.toString(),
        user.email,
        user.role
      );

      await this.userService.updateRefreshToken(
        user._id.toString(),
        tokens.refreshToken
      );

      return tokens;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new AppError(
          ERROR_MESSAGES.TOKEN_EXPIRED,
          HTTP_STATUS.UNAUTHORIZED
        );
      }
      throw new AppError(
        ERROR_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED
      );
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  private generateTokens(
    userId: string,
    email: string,
    role: UserRole
  ): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload: ITokenPayload = { userId, email, role };

    const accessToken = jwt.sign(payload, envConfig.jwt.secret, {
      expiresIn: envConfig.jwt.expire,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, envConfig.jwt.refreshSecret, {
      expiresIn: envConfig.jwt.refreshExpire,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private async getUserCount(): Promise<number> {
    const { User } = await import("../../modules/user/user.model");
    return await User.countDocuments();
  }

  async saveLocation(
    userId: string,
    locationData: ILocationDTO
  ): Promise<void> {
    await this.userService.updateLocation(userId, {
      ...locationData,
      timestamp: new Date(),
      hasGrantedPermission: true,
    });
  }
}
