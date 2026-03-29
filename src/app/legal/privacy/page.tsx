export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-8 text-sm text-gray-600">Last updated: March 28, 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          <p className="leading-relaxed text-gray-700">
            We collect information you provide when creating an account (name, email), payment information processed through Stripe, and booking details (amounts, dates, service descriptions).
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-6 text-gray-700">
            <li>Process payments and transfers</li>
            <li>Send transaction confirmations and PINs</li>
            <li>Maintain account security</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">3. Information Sharing</h2>
          <p className="leading-relaxed text-gray-700">
            We share payment information with Stripe to process transactions. We do not sell your personal information. We may share information when required by law.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">4. Data Security</h2>
          <p className="leading-relaxed text-gray-700">
            Payment data is encrypted and processed through Stripe. We use industry-standard security measures to protect your information.
          </p>

          <h2 className="mb-4 mt-8 text-xl font-semibold text-gray-900">5. Your Rights</h2>
          <p className="leading-relaxed text-gray-700">
            You may request access to, correction of, or deletion of your personal information by contacting support@holdpay.com.
          </p>
        </div>
      </div>
    </div>
  );
}