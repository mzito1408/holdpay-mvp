export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mb-8 text-sm text-gray-600">Last updated: March 28, 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">1. Service Description</h2>
          <p className="leading-relaxed text-gray-700">
            HoldPay provides a payment tool that enables service providers to collect booking deposits from clients. Payments are processed through Stripe. HoldPay does not hold funds in escrow. All payments settle per the terms agreed between the provider and client.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">2. Fees</h2>
          <p className="leading-relaxed text-gray-700">
            HoldPay charges a 2.1% service fee on each transaction. This fee is deducted before funds are transferred to the provider. Additionally, Stripe processing fees (2.9% + $0.30 per transaction) apply. All fees are disclosed before payment is completed.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">3. Provider Responsibilities</h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-700">
            <li>Providers must accurately represent their services and pricing</li>
            <li>Providers must complete payout setup to receive funds</li>
            <li>Providers are responsible for fulfilling agreed services</li>
            <li>Providers must honor their stated refund policies</li>
          </ul>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">4. Client Protections</h2>
          <p className="leading-relaxed text-gray-700">
            Clients have a 15-second grace period after payment to cancel for a full refund. After this period, refunds are subject to the provider&apos;s stated cancellation policy. Payments are released to providers only after the client provides a PIN confirmation code.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">5. Prohibited Activities</h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-700">
            <li>Using HoldPay for illegal services or goods</li>
            <li>Misrepresenting services or pricing</li>
            <li>Attempting to circumvent fees</li>
            <li>Fraudulent bookings or chargebacks</li>
          </ul>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">6. Limitation of Liability</h2>
          <p className="leading-relaxed text-gray-700">
            HoldPay acts solely as a payment facilitator. We are not responsible for disputes between providers and clients, service quality, or fulfillment. All disputes must be resolved directly between the parties.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">7. Termination</h2>
          <p className="leading-relaxed text-gray-700">
            We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">8. Contact</h2>
          <p className="leading-relaxed text-gray-700">
            For questions about these terms, contact: support@holdpay.com
          </p>
        </div>
      </div>
    </div>
  );
}