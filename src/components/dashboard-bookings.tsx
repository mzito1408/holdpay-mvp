"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import CopyLinkButton from "@/components/copy-link-button";
import { formatCurrency } from "@/lib/utils";

type DashboardBooking = {
  id: string;
  reference: string;
  deposit_amount: number;
  client_email: string | null;
  status: string;
  created_at: string;
};

type DashboardBookingsProps = {
  bookings: DashboardBooking[];
};

function getStatusClasses(status: string) {
  if (status === "completed") return "badge-completed";
  if (status === "deposit_secured") return "badge-secured";
  if (status === "awaiting_payment") return "badge-awaiting";
  return "badge-cancelled";
}

export default function DashboardBookings({ bookings }: DashboardBookingsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesReference = booking.reference.toLowerCase().includes(search);
        const matchesEmail = booking.client_email?.toLowerCase().includes(search) ?? false;

        if (!matchesReference && !matchesEmail) {
          return false;
        }
      }

      if (statusFilter !== "all") {
        if (statusFilter === "cancelled_client") {
          return booking.status.startsWith("cancelled");
        }

        if (booking.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, searchTerm, statusFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by reference or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 w-full rounded-xl border border-gray-300 px-4 outline-none transition-all focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 rounded-xl border border-gray-300 bg-white px-4 outline-none transition-all focus:border-[#0ea5e9] focus:ring-4 focus:ring-[#0ea5e9]/10"
        >
          <option value="all">All Bookings</option>
          <option value="awaiting_payment">Awaiting Payment</option>
          <option value="deposit_secured">Deposit Secured</option>
          <option value="completed">Completed</option>
          <option value="cancelled_client">Cancelled</option>
        </select>
      </div>

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
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                  No bookings yet. Create your first booking to get started.
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-5 font-mono text-sm font-medium text-gray-900">
                    {booking.reference}
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-gray-900">
                    {formatCurrency(booking.deposit_amount)}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {booking.client_email || (
                      <span className="italic text-gray-400">Not paid yet</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={getStatusClasses(booking.status)}>
                      {booking.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-500">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {booking.status === "awaiting_payment" ? (
                        <CopyLinkButton reference={booking.reference} />
                      ) : null}
                      {booking.status === "deposit_secured" ? (
                        <Link
                          href={`/booking/${booking.reference}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                        >
                          <span>✓</span>
                          <span>Enter PIN</span>
                        </Link>
                      ) : null}
                      {(booking.status === "completed" || booking.status.startsWith("cancelled")) ? (
                        <Link
                          href={`/booking/${booking.reference}`}
                          className="text-sm font-medium text-[#0ea5e9] hover:underline"
                        >
                          View
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {bookings.length === 0 ? (
          <div className="card-premium text-center text-sm text-gray-500">
            No bookings yet. Create your first booking to get started.
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="card-premium">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-mono text-base font-semibold text-gray-900">
                    {booking.reference}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(booking.deposit_amount)}
                  </div>
                </div>
                <span className={getStatusClasses(booking.status)}>
                  {booking.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                {booking.client_email || <span className="italic text-gray-400">Not paid yet</span>}
              </div>

              {booking.status === "awaiting_payment" ? (
                <CopyLinkButton reference={booking.reference} />
              ) : null}
              {booking.status === "deposit_secured" ? (
                <Link
                  href={`/booking/${booking.reference}`}
                  className="block w-full rounded-xl bg-green-600 py-3.5 text-center font-medium text-white transition-colors hover:bg-green-700"
                >
                  ✓ Enter PIN to Release Funds
                </Link>
              ) : null}
              {(booking.status === "completed" || booking.status.startsWith("cancelled")) ? (
                <Link
                  href={`/booking/${booking.reference}`}
                  className="block w-full rounded-xl bg-gray-100 py-3.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  View Details
                </Link>
              ) : null}
            </div>
          ))
        )}
      </div>

      {filteredBookings.length === 0 && bookings.length > 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p className="mb-2 text-lg">No bookings found</p>
          <p className="text-sm">Try adjusting your search or filter</p>
        </div>
      ) : null}
    </div>
  );
}