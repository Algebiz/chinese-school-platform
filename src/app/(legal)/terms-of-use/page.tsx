export const metadata = {
  title: 'Terms of Use — Charlotte Chinese Academy',
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

export default function TermsOfUsePage() {
  return (
    <div>
      {/* Page header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Terms of Use</h1>
        <p className="mt-1 text-sm text-gray-500">
          Charlotte Chinese Academy — Student Registration Portal
        </p>
        <p className="mt-1 text-xs text-gray-400">Last updated: May 2025</p>
      </div>

      <Section number={1} title="Acceptance of Terms">
        <p>
          By accessing and using the Charlotte Chinese Academy registration portal, you agree
          to be bound by these Terms of Use. If you do not agree, please do not use this
          platform.
        </p>
      </Section>

      <Section number={2} title="Use of the Platform">
        <p>This registration portal is provided exclusively for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Enrolling students in CCA classes</li>
          <li>Managing family account information</li>
          <li>Processing tuition and textbook payments</li>
          <li>Viewing enrollment status and school communications</li>
        </ul>
        <p>
          Unauthorized use, including attempting to access other users&apos; accounts or
          interfering with platform operations, is strictly prohibited.
        </p>
      </Section>

      <Section number={3} title="Account Responsibilities">
        <p>You are responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Maintaining the confidentiality of your login credentials</li>
          <li>Ensuring all information provided is accurate and up to date</li>
          <li>All activity that occurs under your account</li>
          <li>Notifying us immediately of any unauthorized account access</li>
        </ul>
      </Section>

      <Section number={4} title="Enrollment and Payments">
        <ul className="list-disc pl-5 space-y-1">
          <li>Enrollment is confirmed upon successful payment</li>
          <li>Class spots are not guaranteed until payment is completed</li>
          <li>Tuition refund requests are subject to CCA&apos;s refund policy</li>
          <li>
            Textbook purchases are final — books are non-refundable once picked up at school
          </li>
        </ul>
      </Section>

      <Section number={5} title="Intellectual Property">
        <p>
          All content on this platform, including text, graphics, logos, and software, is the
          property of Charlotte Chinese Academy and is protected by applicable intellectual
          property laws.
        </p>
      </Section>

      <Section number={6} title="Limitation of Liability">
        <p>
          Charlotte Chinese Academy provides this platform &ldquo;as is&rdquo; without warranties of any
          kind. We are not liable for any indirect, incidental, or consequential damages
          arising from your use of this platform.
        </p>
      </Section>

      <Section number={7} title="Modifications">
        <p>
          CCA reserves the right to modify these Terms of Use at any time. Continued use of
          the platform after changes constitutes acceptance of the updated terms.
        </p>
      </Section>

      <Section number={8} title="Governing Law">
        <p>
          These Terms of Use are governed by the laws of the State of North Carolina, United
          States.
        </p>
      </Section>

      <Section number={9} title="Contact Us">
        <p>For questions about these Terms of Use, please contact:</p>
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
