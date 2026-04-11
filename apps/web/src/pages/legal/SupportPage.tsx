import LegalPageLayout from './LegalPageLayout';

export default function SupportPage() {
  return (
    <LegalPageLayout
      title="Support"
      subtitle="Source of truth: Docs/legal/support.md"
    >
      {/* Keep support copy in sync with Docs/legal/support.md. */}
      <p>If you need help with Innerbloom, you can contact us through the channels below.</p>

      <section>
        <h2 className="mb-2 text-xl font-semibold">1. General support</h2>
        <p>Email: <strong>support@innerbloomjourney.org</strong></p>
        <p>Use this contact for:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>account issues</li><li>login problems</li><li>billing questions</li><li>subscription questions</li><li>bug reports</li><li>general product support</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">2. Privacy requests</h2>
        <p>Email: <strong>privacy@innerbloomjourney.org</strong></p>
        <p>Use this contact for:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>privacy questions</li><li>personal data access requests</li><li>correction requests</li><li>deletion-related privacy requests</li><li>data protection concerns</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">3. What to include when contacting support</h2>
        <p>To help us review your request faster, include as much of the following as possible:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>the email address used for your Innerbloom account</li>
          <li>the device you are using</li>
          <li>whether you are on iPhone, Android, or web</li>
          <li>the steps that caused the issue</li>
          <li>screenshots, if relevant</li>
          <li>the approximate time the issue happened</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">4. Response expectations</h2>
        <p>We aim to respond as soon as reasonably possible, but response times may vary depending on request type and support volume.</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">5. Website</h2>
        <p>Official website: <strong>https://innerbloomjourney.org</strong></p>
      </section>
    </LegalPageLayout>
  );
}
