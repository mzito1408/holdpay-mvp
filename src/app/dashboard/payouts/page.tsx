"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface ProviderData {
  id: string;
  stripe_account_id: string | null;
  payout_enabled: boolean | null;
}

interface AccountStatusData {
  details_submitted?: boolean;
}

export default function PayoutsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatusData | null>(null);

  useEffect(() => {
    async function loadProviderAndStatus() {
      const supabase = createSupabaseBrowserClient();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }

        const { data: providerData } = await supabase
          .from('providers')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setProvider(providerData as ProviderData | null);

        if (providerData?.stripe_account_id) {
          const statusRes = await fetch('/api/stripe-connect/account-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: providerData.stripe_account_id }),
          });
          const statusData = (await statusRes.json()) as AccountStatusData;
          setAccountStatus(statusData);
        }
      } catch (error) {
        console.error('[Payouts] Load error:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadProviderAndStatus();
  }, [router]);

  async function handleConnectAccount() {
    if (!provider) {
      return;
    }

    setLoading(true);
    try {
      let accountId = provider.stripe_account_id;

      if (!accountId) {
        const createRes = await fetch('/api/stripe-connect/create-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: provider.id }),
        });
        const createData = await createRes.json();
        accountId = createData.account_id;
      }

      const linkRes = await fetch('/api/stripe-connect/account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      const linkData = await linkRes.json();

      window.location.href = linkData.url;
    } catch (error) {
      console.error('[Payouts] Connect error:', error);
      alert('Failed to start payout setup. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const isComplete = provider?.payout_enabled && accountStatus?.details_submitted;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-20">

        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-[#0ea5e9] hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Payout Settings</h1>
          <p className="text-sm text-gray-600 mt-2">
            Connect your bank account to receive payments
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          {isComplete ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Bank Account Connected</h2>
                  <p className="text-sm text-gray-600">You&apos;re ready to receive payments</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Account ID</span>
                  <span className="font-mono text-gray-900">{provider.stripe_account_id?.substring(0, 20)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className="text-green-700 font-medium">Active</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payout Schedule</span>
                  <span className="text-gray-900">Daily (2-day rolling)</span>
                </div>
              </div>

              <button
                onClick={handleConnectAccount}
                className="mt-6 w-full py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Update Payout Details
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏦</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Connect Bank Account</h2>
                  <p className="text-sm text-gray-600">Required to receive booking payments</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <p className="text-sm text-blue-900 leading-relaxed">
                  Payments are processed securely through Stripe. Your banking information is encrypted and never stored on HoldPay servers.
                </p>
              </div>

              <div className="space-y-3 mb-6 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Fast setup (2-3 minutes)</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Daily automatic payouts</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Bank-level security via Stripe</span>
                </div>
              </div>

              <button
                onClick={handleConnectAccount}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-[#0ea5e9] to-[#0284c8] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Connect Bank Account'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Powered by Stripe • Secure encrypted connection
              </p>
            </>
          )}
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">How Payouts Work</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• Payments settle per your agreed terms with clients</p>
            <p>• Stripe processes transfers to your bank account</p>
            <p>• Standard payout time: 2 business days</p>
            <p>• All transactions visible in your Stripe dashboard</p>
          </div>
        </div>

      </div>
    </div>
  );
}