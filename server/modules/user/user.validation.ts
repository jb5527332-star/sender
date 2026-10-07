import Joi from "joi";
import { ROLES, SMTP_STRATEGY } from "../../shared/config/constants";

export const createUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must not exceed 100 characters",
    "any.required": "Name is required",
  }),
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .optional(),
  smtpStrategy: Joi.string()
    .valid(...Object.values(SMTP_STRATEGY))
    .optional(),
  dailyEmailLimit: Joi.number().min(1).max(10000).optional(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .optional(),
  smtpStrategy: Joi.string()
    .valid(...Object.values(SMTP_STRATEGY))
    .optional(),
  isActive: Joi.boolean().optional(),
  dailyEmailLimit: Joi.number().min(1).max(10000).optional(),
  password: Joi.string().min(6).optional().messages({
    "string.min": "Password must be at least 6 characters",
  }),
}).min(1);

export const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  search: Joi.string().allow("").optional(),
});
