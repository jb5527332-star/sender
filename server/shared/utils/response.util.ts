import { Response } from "express";
import { HTTP_STATUS } from "../config/constants";
import { IApiResponse, IPaginatedResponse } from "../types/common.types";

export class ResponseUtil {
  public static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: IApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  public static error(
    res: Response,
    message: string,
    statusCode: number = HTTP_STATUS.BAD_REQUEST,
    errors?: any[]
  ): Response {
    const response: IApiResponse = {
      success: false,
      error: message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  public static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    _message?: string
  ): Response {
    const totalPages = Math.ceil(total / limit);
    const response: IPaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
    return res.status(HTTP_STATUS.OK).json(response);
  }

  public static created<T>(res: Response, data: T, message?: string): Response {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  public static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  public static unauthorized(res: Response, message?: string): Response {
    return this.error(
      res,
      message || "Unauthorized access",
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  public static forbidden(res: Response, message?: string): Response {
    return this.error(
      res,
      message || "Access forbidden",
      HTTP_STATUS.FORBIDDEN
    );
  }

  public static notFound(res: Response, message?: string): Response {
    return this.error(
      res,
      message || "Resource not found",
      HTTP_STATUS.NOT_FOUND
    );
  }

  public static conflict(res: Response, message: string): Response {
    return this.error(res, message, HTTP_STATUS.CONFLICT);
  }

  public static validationError(
    res: Response,
    message: string,
    errors?: any[]
  ): Response {
    return this.error(res, message, HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
  }

  public static tooManyRequests(res: Response, message?: string): Response {
    return this.error(
      res,
      message || "Too many requests",
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }

  public static internalError(res: Response, message?: string): Response {
    return this.error(
      res,
      message || "Internal server error",
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

export default ResponseUtil;
