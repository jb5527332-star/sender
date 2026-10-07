import { Router } from 'express';
import { SmtpController } from './smtp.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { authorize } from '../../shared/middleware/role.middleware';
import { validate, validateQuery } from '../../shared/middleware/validation.middleware';
import { createSmtpSchema, updateSmtpSchema } from './smtp.validation';
import { paginationSchema } from '../../modules/user/user.validation';
import { ROLES } from '../../shared/config/constants';

const router = Router();
const smtpController = new SmtpController();

// Protect all routes
router.use(authenticate);

// Admin only routes
router.use(authorize(ROLES.ADMIN));

router.post('/', validate(createSmtpSchema), smtpController.createSmtp);
router.get('/', validateQuery(paginationSchema), smtpController.getSmtps);
router.get('/stats/usage', smtpController.getUsageStats);
router.get('/stats/available', smtpController.getAvailableCount);
router.get('/available', smtpController.getAvailableSmtps);
router.get('/:id', smtpController.getSmtp);
router.put('/:id', validate(updateSmtpSchema), smtpController.updateSmtp);
router.delete('/:id', smtpController.deleteSmtp);
router.get('/:id/stats', smtpController.getSmtpStats);
router.post('/:id/test', smtpController.testConnection);

export default router;