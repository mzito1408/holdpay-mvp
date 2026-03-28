import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-white text-[#111827]">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tighter">HoldPay</span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#how-it-works" className="hover:text-sky-500">
              How it works
            </a>
            <a href="#providers" className="hover:text-sky-500">
              For Providers
            </a>
            <a href="#final-cta" className="hover:text-sky-500">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-gray-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-2xl bg-sky-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-600"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <section className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 py-12 md:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
            <div className="space-y-8 md:space-y-10">
              <div className="inline-flex items-center gap-2 rounded-3xl border border-[#E5E7EB] bg-white px-5 py-1.5 text-xs font-medium shadow-sm md:text-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                HoldPay is simply the tool
              </div>

              <h1 className="text-5xl font-semibold leading-none tracking-tighter md:text-6xl lg:text-7xl">
                Collect deposits securely.
              </h1>

              <p className="max-w-md text-lg text-[#4B5563] md:text-xl">
                HoldPay is simply the tool for independent contractors to collect
                booking deposits using Stripe. You set the terms, the client pays
                securely, and payments settle per your agreement.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="w-full rounded-2xl bg-sky-500 px-8 py-4 text-center text-base font-medium text-white transition hover:bg-sky-600 sm:w-auto md:text-lg"
                >
                  Start collecting deposits
                </Link>
                <a
                  href="#how-it-works"
                  className="w-full rounded-2xl border border-[#E5E7EB] px-8 py-4 text-center text-base font-medium transition hover:bg-gray-50 sm:w-auto md:text-lg"
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-[280px] overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-2xl md:max-w-md">
                <div className="bg-sky-500 p-5 text-white md:p-6">
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <div className="font-medium">Booking #HPMMYLW3ZLK09LQ</div>
                    <div className="rounded-full bg-white/20 px-3 py-1">PAYMENT CONFIRMED</div>
                  </div>
                  <div className="mt-6 text-center md:mt-8">
                    <div className="text-4xl font-semibold md:text-5xl">$250.00</div>
                    <div className="mt-1 text-xs opacity-75 md:text-sm">
                      processed securely
                    </div>
                  </div>
                </div>
                <div className="p-6 text-center md:p-8">
                  <div className="mx-auto flex h-12 w-40 items-center justify-center rounded-2xl bg-gray-100 font-mono text-3xl tracking-[6px] text-gray-900">
                    839587
                  </div>
                  <div className="mt-3 text-xs text-gray-500 md:text-sm">
                    Confirmation code
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center md:mb-16">
            <div className="text-xs font-medium tracking-widest text-sky-500 md:text-sm">
              3 STEPS • SIMPLE PROCESS
            </div>
            <h2 className="mt-3 text-4xl font-semibold md:text-5xl">How HoldPay works</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 transition-all hover:-translate-y-1 hover:border-sky-500 md:p-8">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl font-semibold text-sky-500 md:h-12 md:w-12">
                1
              </div>
              <h3 className="text-xl font-semibold md:text-2xl">Create your booking</h3>
              <p className="mt-4 text-sm text-[#4B5563] md:text-base">
                Set deposit amount and booking terms. Generate secure link instantly.
              </p>
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 transition-all hover:-translate-y-1 hover:border-sky-500 md:p-8">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl font-semibold text-sky-500 md:h-12 md:w-12">
                2
              </div>
              <h3 className="text-xl font-semibold md:text-2xl">Client pays securely</h3>
              <p className="mt-4 text-sm text-[#4B5563] md:text-base">
                Payment processed and confirmation recorded.
              </p>
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 transition-all hover:-translate-y-1 hover:border-sky-500 md:p-8">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl font-semibold text-sky-500 md:h-12 md:w-12">
                3
              </div>
              <h3 className="text-xl font-semibold md:text-2xl">Funds settle</h3>
              <p className="mt-4 text-sm text-[#4B5563] md:text-base">
                Payments settle per your agreed booking terms.
              </p>
            </div>
          </div>
        </section>

        <section id="providers" className="mx-auto max-w-6xl px-6 pb-16 md:pb-24">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 md:p-8">
              <h3 className="text-xl font-semibold md:text-2xl">For providers</h3>
              <p className="mt-4 text-sm text-[#4B5563] md:text-base">
                Create payment links, define deposit terms, and keep your booking
                process professional from start to finish.
              </p>
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 md:p-8">
              <h3 className="text-xl font-semibold md:text-2xl">For clients</h3>
              <p className="mt-4 text-sm text-[#4B5563] md:text-base">
                Pay securely, receive instant confirmation, and keep a clear record
                of the agreement.
              </p>
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-7 md:p-8">
              <h3 className="text-xl font-semibold md:text-2xl">Built for trust</h3>
              <p className="mt-4 text-sm text-[#4B5563] md:text-base">
                Stripe-powered payments and confirmation workflows help reduce
                friction and protect both sides.
              </p>
            </div>
          </div>
        </section>

        <section id="final-cta" className="bg-sky-500 py-16 text-center text-white md:py-24">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-4xl font-semibold md:text-5xl">
              Start collecting deposits today
            </h2>
            <p className="mt-6 text-base opacity-90 md:text-xl">
              HoldPay is simply the tool. Join independent professionals using secure
              payments.
            </p>
            <Link
              href="/sign-up"
              className="mt-10 inline-block w-full rounded-2xl bg-white px-10 py-5 text-base font-semibold text-sky-500 transition hover:bg-gray-100 md:w-auto md:text-lg"
            >
              Start collecting deposits
            </Link>
          </div>
        </section>

        <footer className="border-t border-[#E5E7EB] bg-white py-8">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <div className="mb-2 text-2xl font-bold tracking-tighter text-sky-500">
              HoldPay
            </div>
            <div className="mb-6 text-sm text-slate-500">
              © 2026 HoldPay. Simply the tool for booking deposits.
            </div>
            <div className="flex justify-center gap-6 text-xs text-slate-500">
              <a href="#" className="hover:text-sky-500">
                Privacy
              </a>
              <a href="#" className="hover:text-sky-500">
                Terms
              </a>
              <a href="#" className="hover:text-sky-500">
                Support
              </a>
              <a href="#" className="hover:text-sky-500">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
