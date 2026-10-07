import Joi from 'joi';
import { SMTP_STATUS } from '../../shared/config/constants';

export const createSmtpSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required',
  }),
  host: Joi.string().required().messages({
    'any.required': 'Host is required',
  }),
  port: Joi.number().min(1).max(65535).required().messages({
    'number.min': 'Port must be between 1 and 65535',
    'number.max': 'Port must be between 1 and 65535',
    'any.required': 'Port is required',
  }),
  secure: Joi.boolean().default(false),
  username: Joi.string().required().messages({
    'any.required': 'Username is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
  fromEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'From email is required',
  }),
  fromName: Joi.string().allow('').optional(),
  dkimEnabled: Joi.boolean().default(false),
  dkimDomain: Joi.string().allow('').optional(),
  dkimSelector: Joi.string().allow('').optional(),
  dkimPrivateKey: Joi.string().allow('').optional(),
  listUnsubscribeEmail: Joi.string().email().allow('').optional(),
  listUnsubscribeUrl: Joi.string().uri().allow('').optional(),
  dailyLimit: Joi.number().min(1).max(10000).optional(),
  priority: Joi.number().min(1).max(10).optional(),
  notes: Joi.string().allow('').optional(),
  isSharedPool: Joi.boolean().optional(),
  availableToUsers: Joi.boolean().optional(),
});

export const updateSmtpSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  host: Joi.string().optional(),
  port: Joi.number().min(1).max(65535).optional(),
  secure: Joi.boolean().optional(),
  username: Joi.string().optional(),
  password: Joi.string().optional(),
  fromEmail: Joi.string().email().optional(),
  fromName: Joi.string().allow('').optional(),
  dkimEnabled: Joi.boolean().optional(),
  dkimDomain: Joi.string().allow('').optional(),
  dkimSelector: Joi.string().allow('').optional(),
  dkimPrivateKey: Joi.string().allow('').optional(),
  listUnsubscribeEmail: Joi.string().email().allow('').optional(),
  listUnsubscribeUrl: Joi.string().uri().allow('').optional(),
  dailyLimit: Joi.number().min(1).max(10000).optional(),
  isActive: Joi.boolean().optional(),
  status: Joi.string()
    .valid(...Object.values(SMTP_STATUS))
    .optional(),
  priority: Joi.number().min(1).max(10).optional(),
  notes: Joi.string().allow('').optional(),
  isSharedPool: Joi.boolean().optional(),
  availableToUsers: Joi.boolean().optional(),
}).min(1);