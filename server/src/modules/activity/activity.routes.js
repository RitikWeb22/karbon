import { Router } from 'express';
import * as activityController from './activity.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.get('/', activityController.listWorkspaceActivity);

export default router;
