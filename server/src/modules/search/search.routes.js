import { Router } from 'express';
import * as searchController from './search.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.get('/', searchController.globalSearch);

export default router;
