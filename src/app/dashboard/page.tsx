import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

function getStatusClasses(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "deposit_secured") return "bg-blue-100 text-blue-800";
  if (status === "awaiting_payment") return "bg-yellow-100 text-yellow-800";
  if (status.includes("cancelled")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

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

        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Bookings</h2>

          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reference
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookingsList.length > 0 ? (
                  bookingsList.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-5 font-mono text-sm font-medium text-gray-900">
                        {booking.reference}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-900">
                        {formatCurrency(booking.deposit_amount)}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {booking.client_email || "Not paid yet"}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            booking.status,
                          )}`}
                        >
                          {booking.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-5">
                        <Link
                          href={`/booking/${booking.reference}`}
                          className="font-medium text-sky-500 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      No bookings yet. Create your first booking to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {bookingsList.length > 0 ? (
              bookingsList.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-base font-semibold text-gray-900">
                        {booking.reference}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrency(booking.deposit_amount)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        booking.status,
                      )}`}
                    >
                      {booking.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {booking.client_email || "Not paid yet"}
                  </div>
                  <Link
                    href={`/booking/${booking.reference}`}
                    className="mt-6 block w-full rounded-xl bg-sky-500 py-3.5 text-center font-medium text-white transition-colors hover:bg-sky-600"
                  >
                    View Booking
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
                No bookings yet. Create your first booking to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}