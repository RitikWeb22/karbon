import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.get('/', analyticsController.getWorkspaceAnalytics);

export default router;
