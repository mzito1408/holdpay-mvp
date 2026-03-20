import Link from "next/link";

const steps = [
  "Create a booking and set a deposit policy.",
  "Share the secure payment link with your client.",
  "Get paid, send the PIN, and release the deposit when the job is complete.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <section className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-sm text-emerald-300">
              HoldPay Standard MVP
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Secure deposit escrow for service providers.
              </h1>
              <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">
                Protect your time with upfront deposits, policy-based refunds,
                payment confirmation, and PIN-based release.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/create"
                className="rounded-full bg-emerald-400 px-6 py-3 text-center font-medium text-slate-950 transition hover:bg-emerald-300"
              >
                Create booking
              </Link>
              <Link
                href="/sign-in"
                className="rounded-full border border-slate-700 px-6 py-3 text-center font-medium text-white transition hover:border-slate-500 hover:bg-slate-900"
              >
                Provider sign in
              </Link>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              How HoldPay works
            </p>
            <div className="mt-6 space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-semibold text-slate-950">
                    {index + 1}
                  </div>
                  <p className="text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">For providers</h2>
            <p className="mt-2 text-sm text-slate-300">
              Create payment links, enforce cancellation policies, and track each
              booking from payment to completion.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">For clients</h2>
            <p className="mt-2 text-sm text-slate-300">
              Pay securely, receive confirmation details instantly, and keep a
              clear record of the agreed refund policy.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Built for trust</h2>
            <p className="mt-2 text-sm text-slate-300">
              Stripe payments, webhook confirmation, and PIN-based completion all
              work together to reduce disputes.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
