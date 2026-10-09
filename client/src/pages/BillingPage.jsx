import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Receipt,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import api from '../lib/api';
import { toast } from 'sonner';

export const BillingPage = () => {
  const { activeWorkspace } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [billing, setBilling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const fetchBilling = async () => {
    try {
      const res = await api.get('/billing');
      setBilling(res.data.data);
    } catch (err) {
      console.error('Failed to load billing data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchBilling();
    }
  }, [activeWorkspace?._id]);

  // Handle return from Stripe Checkout Session
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const isSuccess = searchParams.get('success');
    const isCanceled = searchParams.get('canceled');

    if (sessionId && isSuccess && activeWorkspace?._id) {
      const verifySession = async () => {
        try {
          const res = await api.post('/billing/verify-session', { sessionId });
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          toast.success(res.data.message || 'Payment successful! Subscription activated.');
          fetchBilling();
        } catch (err) {
          console.error('Failed to verify checkout session', err);
          toast.error('Unable to verify Stripe checkout session');
        } finally {
          // Clean query params from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      verifySession();
    } else if (isCanceled) {
      toast.info('Checkout session was canceled');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, activeWorkspace?._id]);

  const handlePlanChange = async (targetPlan) => {
    setChangingPlan(targetPlan);
    try {
      if (targetPlan === 'free') {
        await api.post('/billing/change-plan', { targetPlan });
        toast.success('Successfully switched to the Free Plan');
        fetchBilling();
        return;
      }

      // Paid plans: invoke Stripe Checkout Session
      const res = await api.post('/billing/checkout', { plan: targetPlan });
      const checkoutUrl = res.data?.data?.url;

      if (checkoutUrl && checkoutUrl.startsWith('http')) {
        toast.loading('Redirecting to Stripe secure checkout...');
        window.location.href = checkoutUrl;
        return;
      }

      // Simulated fallback mode
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      toast.success(`Upgraded to ${targetPlan.toUpperCase()} Plan!`);
      fetchBilling();
    } catch (err) {
      console.error('Plan upgrade error:', err);
      toast.error(err.response?.data?.message || 'Failed to initiate checkout session');
    } finally {
      setChangingPlan(null);
    }
  };

  const handleOpenCustomerPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await api.post('/billing/portal');
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open customer portal');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const formatStorageSize = (bytes = 0) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const currentPlan = billing?.plan || 'free';
  const plans = billing?.availablePlans || {};
  const isStripeActive = billing?.isStripeConfigured;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white">Subscription & Billing</h1>
            {isStripeActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Stripe Connected
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage plans, seat allocations, and secure payment methods for{' '}
            <span className="text-zinc-200 font-semibold">{activeWorkspace?.name}</span>
          </p>
        </div>

        {billing?.hasStripeCustomer && (
          <Button
            variant="outline"
            isLoading={isOpeningPortal}
            onClick={handleOpenCustomerPortal}
            className="border-white/10 hover:border-indigo-500/30 text-xs flex items-center gap-2"
          >
            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
            <span>Manage Invoices & Cards</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </Button>
        )}
      </div>

      {/* Usage Meter Summary */}
      <div className="bg-[#111215] border border-white/10 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span>Team Members</span>
            <span className="font-mono text-white font-semibold">
              {billing?.usage?.members} / {billing?.limits?.maxMembers}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  ((billing?.usage?.members || 1) / (billing?.limits?.maxMembers || 1)) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span>Active Projects</span>
            <span className="font-mono text-white font-semibold">
              {billing?.usage?.projects} / {billing?.limits?.maxProjects}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  ((billing?.usage?.projects || 1) / (billing?.limits?.maxProjects || 1)) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
            <span>Storage Quota</span>
            <span className="font-mono text-white font-semibold">
              {formatStorageSize(billing?.usage?.storageBytes)} /{' '}
              {formatStorageSize(billing?.limits?.storageQuotaBytes)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{
                width: `${Math.max(
                  Math.min(
                    ((billing?.usage?.storageBytes || 0) /
                      (billing?.limits?.storageQuotaBytes || 1)) *
                      100,
                    100
                  ),
                  billing?.usage?.storageBytes > 0 ? 2 : 0
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tier Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(plans).map(([key, plan]) => {
          const isCurrent = currentPlan === key;
          const isPro = key === 'pro';
          const isProcessing = changingPlan === key;

          return (
            <div
              key={key}
              className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all ${
                isPro
                  ? 'bg-gradient-to-b from-[#181926] to-[#111215] border-2 border-indigo-500/50 shadow-xl shadow-indigo-600/10'
                  : 'bg-[#111215] border border-white/10'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white capitalize">{plan.name}</h3>
                  {isCurrent && (
                    <Badge variant="emerald" className="text-[10px] uppercase font-bold">
                      Active Plan
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white">${plan.priceMonth}</span>
                  <span className="text-xs text-zinc-400">/ seat / month</span>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  {plan.features?.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full opacity-60">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={isPro ? 'primary' : 'secondary'}
                    isLoading={isProcessing}
                    onClick={() => handlePlanChange(key)}
                    className="w-full flex items-center justify-center gap-2 group"
                  >
                    {key === 'free' ? (
                      <span>Downgrade to Free</span>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-white/70" />
                        <span>Pay & Upgrade to {plan.name}</span>
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 pt-4">
        <Lock className="w-3.5 h-3.5" />
        <span>Bank-grade 256-bit encryption. Handled securely via Stripe Checkout.</span>
      </div>
    </div>
  );
};
