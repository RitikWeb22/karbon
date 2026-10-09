import { Router } from 'express';
import * as projectController from './project.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.get('/', projectController.listProjects);
router.post('/', requireRoles(['owner', 'admin', 'member']), projectController.createProject);
router.get('/:projectId', projectController.getProject);
router.patch('/:projectId', requireRoles(['owner', 'admin', 'member']), projectController.updateProject);
router.delete('/:projectId', requireRoles(['owner', 'admin']), projectController.deleteProject);

export default router;
