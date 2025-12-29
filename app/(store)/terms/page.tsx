import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="flaunt.lol" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-xl font-bold">flaunt.lol</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-gray-400 mb-8">Last updated: December 2024</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using flaunt.lol, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>
              flaunt.lol is a decentralized marketplace platform that enables users to buy and sell
              merchandise using cryptocurrency (Solana/USDC). We connect buyers with merchants
              and facilitate transactions through the Solana blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="mb-4">To use our platform, you must:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Have a valid Solana wallet</li>
              <li>Be at least 18 years of age</li>
              <li>Provide accurate information when creating a store or making purchases</li>
              <li>Keep your wallet credentials secure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Merchant Responsibilities</h2>
            <p className="mb-4">If you are a merchant on our platform, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate product descriptions and images</li>
              <li>Ship products in a timely manner</li>
              <li>Respond to customer inquiries promptly</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not sell prohibited items (illegal goods, counterfeit products, etc.)</li>
              <li>Handle refunds and disputes in good faith</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Buyer Responsibilities</h2>
            <p className="mb-4">As a buyer, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate shipping information</li>
              <li>Ensure sufficient funds in your wallet for purchases</li>
              <li>Communicate with merchants regarding any issues</li>
              <li>Leave honest reviews and feedback</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Platform Fees</h2>
            <p>
              flaunt.lol charges a platform fee on all successful transactions.
              The current fee is 3.5% of the transaction amount.
              This fee is automatically deducted from the merchant's payout.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Payments and Transactions</h2>
            <p className="mb-4">
              All payments are processed on the Solana blockchain. Please note:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Transactions are irreversible once confirmed on the blockchain</li>
              <li>We accept SOL and USDC as payment methods</li>
              <li>Network fees (gas) are paid by the buyer</li>
              <li>Merchants receive payouts to their designated wallet address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Disputes and Refunds</h2>
            <p>
              Disputes should be resolved directly between buyers and merchants.
              While we may assist in facilitating communication, flaunt.lol is not
              responsible for the resolution of disputes. Refunds are at the
              merchant's discretion unless otherwise required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Prohibited Activities</h2>
            <p className="mb-4">You may not use our platform to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Sell illegal or prohibited items</li>
              <li>Engage in fraudulent activities</li>
              <li>Infringe on intellectual property rights</li>
              <li>Harass or harm other users</li>
              <li>Attempt to manipulate or exploit the platform</li>
              <li>Launder money or engage in other financial crimes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Intellectual Property</h2>
            <p>
              The flaunt.lol name, logo, and platform design are our intellectual property.
              Merchants retain ownership of their product content but grant us a license
              to display it on our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Limitation of Liability</h2>
            <p>
              flaunt.lol is provided "as is" without warranties of any kind.
              We are not liable for any damages arising from your use of the platform,
              including but not limited to lost profits, data loss, or transaction failures.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms
              or engage in prohibited activities. Users may also close their accounts at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Changes to Terms</h2>
            <p>
              We may modify these terms at any time. Continued use of the platform
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Contact</h2>
            <p>
              For questions about these terms, contact us through our
              <a href="https://t.me/flauntlol" className="text-blue-400 hover:text-blue-300 ml-1">Telegram</a> or
              <a href="https://x.com/flauntlol" className="text-blue-400 hover:text-blue-300 ml-1">X (Twitter)</a>.
            </p>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            &larr; Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
