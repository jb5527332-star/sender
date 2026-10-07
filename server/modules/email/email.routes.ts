import { Router } from 'express';
import { EmailController } from './email.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorize } from '../../shared/middleware/role.middleware';
import { validate, validateQuery } from '../../shared/middleware/validation.middleware';
import { sendEmailSchema } from './email.validation';
import { paginationSchema } from '../../modules/user/user.validation';
import { ROLES } from '../../shared/config/constants';

const router = Router();
const emailController = new EmailController();

// Protect all routes
router.use(authenticate);

// User routes
router.post(
  '/send',
  validate(sendEmailSchema),
  emailController.sendEmail
);
router.get('/my', validateQuery(paginationSchema), emailController.getMyEmails);
router.get('/stats/me', emailController.getMyStats);
router.get('/progress/daily', emailController.getDailyProgress);
router.get('/from/next', emailController.getNextFromAddress);

// Admin routes
router.get(
  '/',
  authorize(ROLES.ADMIN),
  validateQuery(paginationSchema),
  emailController.getAllEmails
);
router.get('/stats', authorize(ROLES.ADMIN), emailController.getAllStats);
router.get('/stats/queue', authorize(ROLES.ADMIN), emailController.getQueueStats);
router.get('/:id', emailController.getEmail);
router.post('/:id/retry', authorize(ROLES.ADMIN), emailController.retryEmail);
router.delete('/:id', authorize(ROLES.ADMIN), emailController.deleteEmail);

export default router;
