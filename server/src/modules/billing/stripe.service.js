import Stripe from 'stripe';
import { ENV } from '../../config/env.js';

export const isStripeConfigured = Boolean(
  ENV.STRIPE_SECRET_KEY &&
  (ENV.STRIPE_SECRET_KEY.startsWith('sk_test_') || ENV.STRIPE_SECRET_KEY.startsWith('sk_live_'))
);

export const stripe = isStripeConfigured
  ? new Stripe(ENV.STRIPE_SECRET_KEY)
  : null;

/**
 * Find or create a Stripe Customer for the active workspace
 */
export const getOrCreateStripeCustomer = async ({ workspace, user }) => {
  if (!stripe) return null;

  if (workspace.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(workspace.stripeCustomerId);
      if (existing && !existing.deleted) {
        return existing.id;
      }
    } catch {
      // Customer was deleted or invalid in stripe, create a new one below
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.name} (${workspace.name})`,
    metadata: {
      workspaceId: workspace._id.toString(),
      workspaceSlug: workspace.slug,
      userId: user._id.toString(),
    },
  });

  workspace.stripeCustomerId = customer.id;
  await workspace.save();

  return customer.id;
};

/**
 * Create a Stripe Hosted Checkout Session for subscription
 */
export const createStripeCheckoutSession = async ({ workspace, user, plan, planConfig }) => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const customerId = await getOrCreateStripeCustomer({ workspace, user });

  // Determine line item configuration (configured price ID or dynamic product data)
  const isCustomPriceId = (priceId) =>
    Boolean(priceId && !priceId.includes('placeholder') && priceId.startsWith('price_'));

  let lineItem;
  if (plan === 'pro' && isCustomPriceId(ENV.STRIPE_PRO_PRICE_ID)) {
    lineItem = { price: ENV.STRIPE_PRO_PRICE_ID, quantity: 1 };
  } else if (plan === 'enterprise' && isCustomPriceId(ENV.STRIPE_ENTERPRISE_PRICE_ID)) {
    lineItem = { price: ENV.STRIPE_ENTERPRISE_PRICE_ID, quantity: 1 };
  } else {
    lineItem = {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Karbon ${planConfig.name} Plan`,
          description: `Full access to Karbon ${planConfig.name} for workspace: ${workspace.name}`,
        },
        unit_amount: Math.round(planConfig.priceMonth * 100),
        recurring: {
          interval: 'month',
        },
      },
      quantity: 1,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    client_reference_id: workspace._id.toString(),
    line_items: [lineItem],
    metadata: {
      workspaceId: workspace._id.toString(),
      targetPlan: plan,
      userId: user._id.toString(),
    },
    subscription_data: {
      metadata: {
        workspaceId: workspace._id.toString(),
        targetPlan: plan,
      },
    },
    success_url: `${ENV.CLIENT_URL}/billing?session_id={CHECKOUT_SESSION_ID}&success=true&plan=${plan}`,
    cancel_url: `${ENV.CLIENT_URL}/billing?canceled=true`,
  });

  return session;
};

/**
 * Create a Stripe Billing Customer Portal session
 */
export const createStripePortalSession = async ({ customerId }) => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${ENV.CLIENT_URL}/billing`,
  });

  return portalSession;
};

/**
 * Retrieve and verify a checkout session
 */
export const retrieveCheckoutSession = async (sessionId) => {
  if (!stripe) return null;
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });
};
