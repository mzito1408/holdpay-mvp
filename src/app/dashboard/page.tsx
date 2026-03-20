import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient, getSupabaseServerUser } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

function getStatusClasses(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "deposit_secured") return "bg-blue-100 text-blue-800";
  if (status === "awaiting_payment") return "bg-yellow-100 text-yellow-800";
  if (status.includes("cancelled")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default async function DashboardPage() {
  const admin = createSupabaseAdminClient();
  const user = await getSupabaseServerUser();

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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {provider.name}</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Active Bookings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {activeBookings.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {completedBookings.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Link
            href="/dashboard/create"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Booking
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {bookingsList.length > 0 ? (
                bookingsList.map((booking) => (
                  <tr key={booking.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {booking.reference}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(booking.deposit_amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {booking.client_email || "Not paid"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusClasses(
                          booking.status,
                        )}`}
                      >
                        {booking.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <Link
                        href={`/booking/${booking.reference}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No bookings yet. Create your first booking to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}