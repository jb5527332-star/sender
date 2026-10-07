import Joi from "joi";
import { EMAIL_PRIORITY } from "../../shared/config/constants";

export const sendEmailSchema = Joi.object({
  fromEmail: Joi.string().email().optional().messages({
    "string.email": "Please provide a valid from email",
  }),
  fromName: Joi.string().allow("").optional(),
  toEmail: Joi.string().email().required().messages({
    "string.email": "Please provide a valid to email",
    "any.required": "To email is required",
  }),
  ccEmail: Joi.string().email().allow("").optional(),
  bccEmail: Joi.string().email().allow("").optional(),
  replyTo: Joi.string().email().allow("").optional(),
  subject: Joi.string().min(1).max(500).required().messages({
    "string.min": "Subject is required",
    "string.max": "Subject must not exceed 500 characters",
    "any.required": "Subject is required",
  }),
  message: Joi.string().required().messages({
    "any.required": "Message is required",
  }),
  messageFormat: Joi.string().valid("html", "plain").default("html"),
  priority: Joi.string()
    .valid(...Object.values(EMAIL_PRIORITY))
    .default(EMAIL_PRIORITY.NORMAL),
  customHeaders: Joi.string().allow("").optional(),
  attachments: Joi.array()
    .items(
      Joi.object({
        filename: Joi.string().required(),
        content: Joi.string().required(),
        contentType: Joi.string().optional(),
      })
    )
    .optional(),
  smtpId: Joi.string().optional(),
});
