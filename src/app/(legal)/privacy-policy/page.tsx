export const metadata = {
  title: 'Privacy Policy — Charlotte Chinese Academy',
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-gray-900">
        {number}. {title}
      </h2>
      <div className="mt-2 text-sm text-gray-700 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div>
      {/* Page header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-1 text-sm text-gray-500">
          Charlotte Chinese Academy — Student Registration Portal
        </p>
        <p className="mt-1 text-xs text-gray-400">Last updated: May 2025</p>
      </div>

      <Section number={1} title="Introduction">
        <p>
          Charlotte Chinese Academy (&ldquo;CCA&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the
          student registration portal at chinese-school-platform.vercel.app. This Privacy Policy
          explains how we collect, use, and protect your personal information when you use our
          registration platform.
        </p>
      </Section>

      <Section number={2} title="Information We Collect">
        <p>We collect the following information when you register:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Parent/guardian name, email address, and phone number</li>
          <li>Student name, date of birth, and grade level</li>
          <li>Class enrollment selections</li>
          <li>
            Payment information (processed securely via Stripe or PayPal — we do not store
            credit card numbers)
          </li>
        </ul>
      </Section>

      <Section number={3} title="How We Use Your Information">
        <p>We use your information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Process student enrollment and class assignments</li>
          <li>Send enrollment confirmation and school communications</li>
          <li>Process tuition and textbook payments</li>
          <li>Manage class rosters and administrative records</li>
          <li>Send important school announcements and updates</li>
        </ul>
      </Section>

      <Section number={4} title="Data Sharing">
        <p>
          We do not sell, trade, or share your personal information with third parties except:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Payment processors (Stripe, PayPal) to complete transactions</li>
          <li>Email service providers to send confirmations and notifications</li>
          <li>As required by law</li>
        </ul>
      </Section>

      <Section number={5} title="Data Security">
        <p>
          We implement appropriate security measures to protect your personal information. All
          payment transactions are encrypted and processed through PCI-compliant payment
          providers.
        </p>
      </Section>

      <Section number={6} title="Data Retention">
        <p>
          We retain enrollment records for the duration required by applicable education
          regulations. You may request deletion of your account by contacting us directly.
        </p>
      </Section>

      <Section number={7} title="Children's Privacy">
        <p>
          Our platform collects student information as part of the enrollment process. Parents
          and guardians are responsible for providing consent on behalf of their children. We do
          not knowingly collect information directly from children under 13.
        </p>
      </Section>

      <Section number={8} title="Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access the personal information we hold about you</li>
          <li>Request corrections to inaccurate information</li>
          <li>Request deletion of your account and associated data</li>
          <li>Opt out of non-essential communications</li>
        </ul>
      </Section>

      <Section number={9} title="Cookies">
        <p>
          Our platform uses essential cookies for authentication and session management. We do
          not use cookies for advertising or tracking purposes.
        </p>
      </Section>

      <Section number={10} title="Contact Us">
        <p>
          If you have questions about this Privacy Policy, please contact us at:
        </p>
        <address className="not-italic mt-2 text-sm text-gray-600 leading-relaxed">
          Charlotte Chinese Academy<br />
          5800 Sardis Road, Charlotte, NC 28270<br />
          <a
            href="mailto:info@charlottechineseacademy.org"
            className="text-red-600 hover:text-red-700 underline"
          >
            info@charlottechineseacademy.org
          </a>
        </address>
      </Section>
    </div>
  )
}
