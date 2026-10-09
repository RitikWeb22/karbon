import { Router } from 'express';
import * as taskController from './task.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.post('/', requireRoles(['owner', 'admin', 'member']), taskController.createTask);
router.get('/:taskId', taskController.getTask);
router.patch('/:taskId', requireRoles(['owner', 'admin', 'member']), taskController.updateTask);
router.post('/:taskId/move', requireRoles(['owner', 'admin', 'member']), taskController.moveTask);
router.delete('/:taskId', requireRoles(['owner', 'admin', 'member']), taskController.deleteTask);

export default router;
