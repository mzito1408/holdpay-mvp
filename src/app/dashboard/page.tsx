import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import DashboardBookings from "@/components/dashboard-bookings";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createSupabaseAdminClient();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: provider } = await admin
    .from("providers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!provider) {
    redirect("/sign-in");
  }

  const { data: bookings } = await admin
    .from("bookings")
    .select("*")
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false });

  const bookingsList = bookings ?? [];
  const activeBookings = bookingsList.filter((booking) =>
    ["awaiting_payment", "deposit_secured"].includes(booking.status),
  );
  const completedBookings = bookingsList.filter(
    (booking) => booking.status === "completed",
  );
  const totalEarnings = completedBookings.reduce(
    (sum, booking) => sum + booking.deposit_amount,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-gray-600">Welcome back, {provider.name}</p>
        </div>

        {!provider.payout_enabled && (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                <span className="text-2xl">🏦</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold text-blue-900">
                  Connect your bank account to receive payments
                </h3>
                <p className="mb-4 text-sm text-blue-800">
                  You can create bookings, but funds won&apos;t be released until you complete payout setup.
                </p>
                <Link
                  href="/dashboard/payouts"
                  className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Connect Bank Account
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Active Bookings</p>
            <p className="mt-2 text-4xl font-semibold text-gray-900">
              {activeBookings.length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="mt-2 text-4xl font-semibold text-gray-900">
              {completedBookings.length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total Earnings</p>
            <p className="mt-2 text-4xl font-semibold text-gray-900">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <Link
            href="/dashboard/create"
            className="inline-flex items-center rounded-xl bg-sky-500 px-6 py-3 font-medium text-white transition-colors hover:bg-sky-600"
          >
            + Create New Booking
          </Link>
        </div>

        <DashboardBookings bookings={bookingsList} />
      </div>
    </div>
  );
}