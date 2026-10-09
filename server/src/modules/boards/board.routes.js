import { Router } from 'express';
import * as boardController from './board.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.get('/:boardId', boardController.getBoardDetails);
router.post('/:boardId/columns', requireRoles(['owner', 'admin', 'member']), boardController.createColumn);
router.patch('/columns/:columnId', requireRoles(['owner', 'admin', 'member']), boardController.updateColumn);
router.delete('/columns/:columnId', requireRoles(['owner', 'admin']), boardController.deleteColumn);

export default router;
