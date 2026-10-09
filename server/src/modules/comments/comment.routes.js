import { Router } from 'express';
import * as commentController from './comment.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate, requireWorkspace);

router.get('/tasks/:taskId', commentController.listComments);
router.post('/tasks/:taskId', commentController.createComment);
router.delete('/:commentId', commentController.deleteComment);

export default router;
