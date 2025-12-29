import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">Last updated: December 2024</p>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to flaunt.lol. We respect your privacy and are committed to protecting your personal data.
              This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Wallet Addresses:</strong> Your Solana wallet public address when you connect to our platform</li>
              <li><strong>Transaction Data:</strong> Records of purchases, sales, and payments made through our platform</li>
              <li><strong>Store Information:</strong> For merchants, we collect store details, product information, and payout addresses</li>
              <li><strong>Contact Information:</strong> Email addresses provided for order notifications and support</li>
              <li><strong>Usage Data:</strong> How you interact with our platform, including pages visited and features used</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Process transactions and facilitate payments</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Send order confirmations and shipping updates</li>
              <li>Improve our platform and user experience</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Blockchain Transactions</h2>
            <p>
              Please note that transactions on the Solana blockchain are public and immutable.
              Your wallet address and transaction history are visible on the blockchain.
              We cannot delete or modify blockchain data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Storage and Security</h2>
            <p>
              We implement industry-standard security measures to protect your data.
              Your information is stored on secure servers and we use encryption for sensitive data transmission.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Third-Party Services</h2>
            <p className="mb-4">We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Solana Blockchain:</strong> For processing cryptocurrency payments</li>
              <li><strong>Cloudflare:</strong> For content delivery and security</li>
              <li><strong>Email Services:</strong> For sending transactional emails</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (where applicable)</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and preferences.
              These cookies are necessary for the platform to function properly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time.
              We will notify you of any changes by posting the new policy on this page
              and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us through our
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
