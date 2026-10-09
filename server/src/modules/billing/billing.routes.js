import { Router } from 'express';
import * as billingController from './billing.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspace } from '../../middlewares/tenant.middleware.js';
import { requireRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

// Public webhook route (Stripe calls this directly)
router.post('/webhook', billingController.handleWebhook);

// Protected tenant routes
router.use(authenticate, requireWorkspace);

router.get('/', billingController.getBillingDetails);
router.post('/change-plan', requireRoles(['owner']), billingController.changePlan);
router.post('/checkout', requireRoles(['owner']), billingController.createCheckoutSession);
router.post('/verify-session', requireRoles(['owner', 'admin']), billingController.verifyCheckoutSession);
router.post('/portal', requireRoles(['owner']), billingController.createPortalSession);

export default router;
