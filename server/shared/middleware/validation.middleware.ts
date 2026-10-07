import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ResponseUtil } from "../utils/response.util";

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return ResponseUtil.validationError(res, "Validation failed", errors);
    }

    req.body = value;
    return next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return ResponseUtil.validationError(res, "Validation failed", errors);
    }

    // Instead of overwriting req.query, merge the validated values
    Object.assign(req.query, value);
    return next();
  };
};
