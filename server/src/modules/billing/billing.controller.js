import { Workspace } from '../../models/Workspace.js';
import { Membership } from '../../models/Membership.js';
import { Project } from '../../models/Project.js';
import { Activity } from '../../models/Activity.js';
import { WebhookEvent } from '../../models/WebhookEvent.js';
import { ENV } from '../../config/env.js';
import {
  stripe,
  isStripeConfigured,
  createStripeCheckoutSession,
  createStripePortalSession,
  retrieveCheckoutSession,
} from './stripe.service.js';

export const PLAN_LIMITS = {
  free: {
    maxMembers: 1,
    maxProjects: 2,
    storageQuotaBytes: 500 * 1024 * 1024, // 500 MB
    name: 'Free',
    priceMonth: 0,
    features: ['Single-user solo workspace (1 member only)', '2 active projects', 'Standard Kanban boards', '500 MB attachments storage'],
  },
  pro: {
    maxMembers: 100,
    maxProjects: 100,
    storageQuotaBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    name: 'Pro',
    priceMonth: 16,
    features: ['Unlimited members', 'Unlimited projects', 'Real-time multiplayer presence', 'Advanced analytics & charts', 'Priority support'],
  },
  enterprise: {
    maxMembers: 1000,
    maxProjects: 1000,
    storageQuotaBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    name: 'Enterprise',
    priceMonth: 39,
    features: ['Everything in Pro', 'Custom SLA & 99.99% uptime', 'Audit logs export', 'Dedicated success architect', 'SSO & SAML integration'],
  },
};

export const getBillingDetails = async (req, res, next) => {
  try {
    const currentPlanKey = req.workspace.plan || 'free';
    const planConfig = PLAN_LIMITS[currentPlanKey] || PLAN_LIMITS.free;

    const membersCount = await Membership.countDocuments({ workspaceId: req.workspace._id });
    const projectsCount = await Project.countDocuments({ workspaceId: req.workspace._id, isArchived: false });

    // Dynamically calculate accurate storage used across tasks attachments
    const { Task } = await import('../../models/Task.js');
    const tasksWithAttachments = await Task.find(
      { workspaceId: req.workspace._id, 'attachments.0': { $exists: true } },
      'attachments'
    );

    let calculatedStorageBytes = 0;
    tasksWithAttachments.forEach((t) => {
      t.attachments?.forEach((att) => {
        if (att.size && att.size > 0) {
          calculatedStorageBytes += att.size;
        } else if (att.url && typeof att.url === 'string' && att.url.startsWith('data:')) {
          calculatedStorageBytes += Math.round(att.url.length * 0.75);
        }
      });
    });

    const actualStorage = Math.max(req.workspace.storageUsedBytes || 0, calculatedStorageBytes);
    if (actualStorage !== req.workspace.storageUsedBytes) {
      await Workspace.findByIdAndUpdate(req.workspace._id, { storageUsedBytes: actualStorage });
    }

    res.json({
      success: true,
      data: {
        plan: currentPlanKey,
        subscriptionStatus: req.workspace.subscriptionStatus || 'active',
        limits: planConfig,
        usage: {
          members: membersCount,
          projects: projectsCount,
          storageBytes: actualStorage,
        },
        availablePlans: PLAN_LIMITS,
        isStripeConfigured,
        hasStripeCustomer: Boolean(req.workspace.stripeCustomerId),
        stripeCustomerId: req.workspace.stripeCustomerId || null,
        stripePublishableKey: ENV.STRIPE_PUBLISHABLE_KEY || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePlan = async (req, res, next) => {
  try {
    const { targetPlan } = req.body;
    if (!['free', 'pro', 'enterprise'].includes(targetPlan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    req.workspace.plan = targetPlan;
    req.workspace.subscriptionStatus = 'active';
    await req.workspace.save();

    await Activity.create({
      workspaceId: req.workspace._id,
      actorId: req.user._id,
      action: 'subscription:updated',
      resourceType: 'workspace',
      resourceId: req.workspace._id,
      metadata: { targetPlan },
    });

    res.json({
      success: true,
      message: `Plan successfully updated to ${PLAN_LIMITS[targetPlan].name}`,
      data: {
        plan: targetPlan,
        subscriptionStatus: 'active',
        limits: PLAN_LIMITS[targetPlan],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCheckoutSession = async (req, res, next) => {
  try {
    const { plan = 'pro' } = req.body;

    if (!['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription tier for checkout' });
    }

    const planConfig = PLAN_LIMITS[plan];

    // When Stripe is configured, create a live Stripe Checkout Session
    if (isStripeConfigured) {
      const session = await createStripeCheckoutSession({
        workspace: req.workspace,
        user: req.user,
        plan,
        planConfig,
      });

      return res.json({
        success: true,
        message: 'Stripe checkout session created successfully',
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    }

    // Local development simulation fallback:
    req.workspace.plan = plan;
    req.workspace.subscriptionStatus = 'active';
    await req.workspace.save();

    res.json({
      success: true,
      message: 'Subscription checkout processed successfully (demo mode)',
      data: {
        url: `${ENV.CLIENT_URL}/billing?success=true&plan=${plan}`,
      },
    });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    next(error);
  }
};

export const verifyCheckoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    if (isStripeConfigured) {
      const session = await retrieveCheckoutSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, message: 'Checkout session not found' });
      }

      // Verify the session belongs to this workspace
      const sessionWorkspaceId = session.metadata?.workspaceId || session.client_reference_id;
      if (sessionWorkspaceId && sessionWorkspaceId !== req.workspace._id.toString()) {
        return res.status(403).json({ success: false, message: 'Session does not belong to active workspace' });
      }

      const targetPlan = session.metadata?.targetPlan || 'pro';
      req.workspace.plan = targetPlan;
      req.workspace.subscriptionStatus = 'active';

      if (session.customer) {
        req.workspace.stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : session.customer.id;
      }
      if (session.subscription) {
        req.workspace.stripeSubscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
      }

      await req.workspace.save();

      await Activity.create({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        action: 'subscription:checkout_completed',
        resourceType: 'workspace',
        resourceId: req.workspace._id,
        metadata: { targetPlan, sessionId: session.id },
      });

      return res.json({
        success: true,
        message: `Upgraded to ${PLAN_LIMITS[targetPlan]?.name || targetPlan} Plan successfully!`,
        data: {
          plan: targetPlan,
          subscriptionStatus: 'active',
          limits: PLAN_LIMITS[targetPlan],
        },
      });
    }

    // Fallback if not configured
    res.json({
      success: true,
      message: 'Checkout verified successfully',
      data: {
        plan: req.workspace.plan,
        subscriptionStatus: 'active',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPortalSession = async (req, res, next) => {
  try {
    if (!isStripeConfigured) {
      return res.status(400).json({ success: false, message: 'Stripe is not configured in this environment' });
    }

    if (!req.workspace.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No active Stripe customer found. Please subscribe to a paid plan first.',
      });
    }

    const portalSession = await createStripePortalSession({
      customerId: req.workspace.stripeCustomerId,
    });

    res.json({
      success: true,
      data: {
        url: portalSession.url,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (ENV.STRIPE_WEBHOOK_SECRET && !ENV.STRIPE_WEBHOOK_SECRET.includes('placeholder')) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, ENV.STRIPE_WEBHOOK_SECRET);
    } else {
      // In local dev without secret, parse payload
      event = req.body;
    }
  } catch (err) {
    console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency check
  if (event.id) {
    const existing = await WebhookEvent.findOne({ eventId: event.id });
    if (existing) {
      return res.json({ received: true, status: 'already_processed' });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspaceId || session.client_reference_id;
        const targetPlan = session.metadata?.targetPlan || 'pro';

        if (workspaceId) {
          const workspace = await Workspace.findById(workspaceId);
          if (workspace) {
            workspace.plan = targetPlan;
            workspace.subscriptionStatus = 'active';
            if (session.customer) {
              workspace.stripeCustomerId = session.customer;
            }
            if (session.subscription) {
              workspace.stripeSubscriptionId = session.subscription;
            }
            await workspace.save();
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const workspace = await Workspace.findOne({ stripeSubscriptionId: subscription.id });
        if (workspace) {
          workspace.subscriptionStatus = subscription.status === 'active' ? 'active' : subscription.status;
          await workspace.save();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const workspace = await Workspace.findOne({ stripeSubscriptionId: subscription.id });
        if (workspace) {
          workspace.plan = 'free';
          workspace.subscriptionStatus = 'canceled';
          await workspace.save();
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const workspace = await Workspace.findOne({ stripeCustomerId: invoice.customer });
        if (workspace) {
          workspace.subscriptionStatus = 'past_due';
          await workspace.save();
        }
        break;
      }

      default:
        break;
    }

    if (event.id) {
      await WebhookEvent.create({
        eventId: event.id,
        eventType: event.type,
        status: 'processed',
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error handling webhook event:', err);
    if (event.id) {
      await WebhookEvent.create({
        eventId: event.id,
        eventType: event.type,
        status: 'failed',
        error: err.message,
      });
    }
    res.status(500).json({ error: 'Webhook processing error' });
  }
};
