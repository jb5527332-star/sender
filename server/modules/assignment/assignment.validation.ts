import Joi from 'joi';

export const createAssignmentSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': 'User ID is required',
  }),
  smtpId: Joi.string().required().messages({
    'any.required': 'SMTP ID is required',
  }),
  priority: Joi.number().min(1).max(10).default(1),
  isPrimary: Joi.boolean().default(false),
});

export const updateAssignmentSchema = Joi.object({
  priority: Joi.number().min(1).max(10).optional(),
  isPrimary: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
}).min(1);