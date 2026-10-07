export const ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const SMTP_STRATEGY = {
  DEDICATED: "dedicated",
  SHARED_POOL: "shared_pool",
  ASSIGNED: "assigned",
} as const;

export type SmtpStrategy = (typeof SMTP_STRATEGY)[keyof typeof SMTP_STRATEGY];

export const SMTP_STATUS = {
  ACTIVE: "active",
  RATE_LIMITED: "rate_limited",
  FAILED: "failed",
  DISABLED: "disabled",
} as const;

export type SmtpStatus = (typeof SMTP_STATUS)[keyof typeof SMTP_STATUS];

export const EMAIL_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
  RETRYING: "retrying",
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export const EMAIL_PRIORITY = {
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
} as const;

export type EmailPriority =
  (typeof EMAIL_PRIORITY)[keyof typeof EMAIL_PRIORITY];

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  NOT_FOUND: "Resource not found",
  VALIDATION_ERROR: "Validation error",
  INTERNAL_ERROR: "Internal server error",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later.",
  INVALID_CREDENTIALS: "Invalid credentials",
  EMAIL_EXISTS: "Email already exists",
  USER_NOT_FOUND: "User not found",
  USER_INACTIVE: "User account is inactive",
  SMTP_NOT_FOUND: "SMTP server not found",
  SMTP_UNAVAILABLE: "No SMTP servers available",
  DAILY_LIMIT_REACHED: "Daily email limit reached",
  INVALID_TOKEN: "Invalid or expired token",
  TOKEN_EXPIRED: "Token has expired",
  REFRESH_TOKEN_INVALID: "Invalid refresh token",
  EMAIL_SEND_FAILED: "Failed to send email",
  ASSIGNMENT_EXISTS: "SMTP assignment already exists",
  ASSIGNMENT_NOT_FOUND: "SMTP assignment not found",
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  TOKEN_REFRESHED: "Token refreshed successfully",
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  SMTP_CREATED: "SMTP server created successfully",
  SMTP_UPDATED: "SMTP server updated successfully",
  SMTP_DELETED: "SMTP server deleted successfully",
  EMAIL_QUEUED: "Email queued successfully",
  EMAIL_SENT: "Email sent successfully",
  ASSIGNMENT_CREATED: "SMTP assignment created successfully",
  ASSIGNMENT_UPDATED: "SMTP assignment updated successfully",
  ASSIGNMENT_DELETED: "SMTP assignment deleted successfully",
  ASSIGNMENT_FETCHED: "SMTP assignments fetched successfully",
} as const;
