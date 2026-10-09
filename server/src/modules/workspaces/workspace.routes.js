import { Router } from 'express';
import * as workspaceController from './workspace.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', workspaceController.listWorkspaces);
router.post('/', workspaceController.createWorkspace);
router.post('/join', workspaceController.joinWorkspaceWithCode);

router.get('/:workspaceId', requireWorkspace, workspaceController.getWorkspace);
router.patch('/:workspaceId', requireWorkspace, requireRoles(['owner', 'admin']), workspaceController.updateWorkspace);

router.get('/:workspaceId/members', requireWorkspace, workspaceController.listMembers);
router.post('/:workspaceId/invitations', requireWorkspace, requireRoles(['owner', 'admin']), workspaceController.inviteMember);
router.patch('/:workspaceId/members/:memberId', requireWorkspace, requireRoles(['owner', 'admin']), workspaceController.updateMemberRole);
router.delete('/:workspaceId/members/:memberId', requireWorkspace, requireRoles(['owner', 'admin']), workspaceController.removeMember);

export default router;
