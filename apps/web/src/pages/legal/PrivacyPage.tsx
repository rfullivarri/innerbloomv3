import LegalPageLayout from './LegalPageLayout';

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="Source of truth: Docs/legal/privacy-policy.md"
    >
      {/* Keep legal copy in sync with Docs/legal/privacy-policy.md. */}
      <p><strong>Last updated:</strong> 2026-04-11</p>
      <p>
        Innerbloom (<strong>“Innerbloom”</strong>, <strong>“we”</strong>, <strong>“us”</strong>, or <strong>“our”</strong>)
        provides an adaptive habit-building experience that helps users organize routines, complete guided daily actions,
        track progress, and reflect on emotional patterns over time.
      </p>
      <p>
        This Privacy Policy explains what information we collect, how we use it, when we share it, and the choices available to users.
      </p>

      <section>
        <h2 className="mb-2 text-xl font-semibold">1. Who operates Innerbloom</h2>
        <p>Innerbloom is operated by Ramiro Fernandez de Ulllivarri, an individual based in Spain.</p>
        <p>Service name: <strong>Innerbloom</strong></p>
        <p>Website: <strong>https://innerbloomjourney.org</strong></p>
        <p>API domain used by the product: <strong>https://apiv2.innerbloomjourney.org</strong></p>
        <p>Contact emails:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Privacy: <strong>privacy@innerbloomjourney.org</strong></li>
          <li>Support: <strong>support@innerbloomjourney.org</strong></li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">2. Information we collect</h2>
        <p>Depending on how you use Innerbloom, we may collect and process the following categories of information.</p>
        <h3 className="mb-2 mt-4 text-lg font-medium">a. Account and profile information</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>email address</li><li>first name</li><li>last name</li><li>full name</li><li>profile image URL</li><li>authentication provider user ID</li>
        </ul>
        <p>We use this information to create and manage accounts, authenticate users, and provide access to the service.</p>
        <h3 className="mb-2 mt-4 text-lg font-medium">b. Habit, onboarding, and journey information</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>onboarding responses</li><li>selected rhythm, mode, or preference settings</li><li>task and habit configuration</li><li>task completion history</li><li>missions, streaks, rewards, and progress signals</li><li>daily reflections or emotional check-in data</li><li>reminder preferences</li><li>timezone settings</li>
        </ul>
        <p>We use this information to personalize the experience, generate plans, adapt tasks, display progress, and improve how the product responds to each user’s journey.</p>
        <h3 className="mb-2 mt-4 text-lg font-medium">c. Device, technical, and usage information</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>basic technical request data needed to operate the service</li><li>app interaction events</li><li>diagnostics and product telemetry</li><li>analytics data on the web experience</li>
        </ul>
        <p>We use this information to maintain the service, diagnose issues, understand usage patterns, and improve the product.</p>
        <h3 className="mb-2 mt-4 text-lg font-medium">d. Notifications and communications</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>push notification preferences</li><li>local notification settings</li><li>email delivery metadata related to reminders or transactional emails</li><li>communications sent to our support or privacy email addresses</li>
        </ul>
        <p>We use this information to deliver reminders, service communications, account-related notifications, and support responses.</p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">3. How we use information</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>authenticate users and secure accounts</li><li>create and maintain a personalized habit journey</li><li>deliver tasks, daily quests, reminders, and progress insights</li><li>display emotional and habit patterns over time</li><li>provide support and troubleshoot issues</li><li>measure usage and improve the product</li><li>send essential service, account, reminder, or transactional communications</li><li>comply with legal obligations and enforce our terms</li>
        </ul>
      </section>

      <section><h2 className="mb-2 text-xl font-semibold">4. Legal bases</h2><ul className="list-disc space-y-1 pl-6"><li>performance of a contract</li><li>legitimate interests in operating, securing, and improving the service</li><li>user consent, where required</li><li>compliance with legal obligations</li></ul></section>
      <section><h2 className="mb-2 text-xl font-semibold">5. Analytics, cookies, and tracking</h2><p>Innerbloom uses <strong>Google Analytics 4 (GA4)</strong> on the web experience.</p><p>Where required by law, analytics are activated only after the user gives consent through the website’s cookie settings flow. Users can later change that choice through the website’s cookie controls, where available.</p><p>Innerbloom does <strong>not</strong> serve third-party advertising in the product at this stage.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">6. Notifications</h2><ul className="list-disc space-y-1 pl-6"><li>push notifications</li><li>local notifications</li><li>transactional emails</li><li>reminder emails</li></ul></section>
      <section><h2 className="mb-2 text-xl font-semibold">7. Sharing of information</h2><p>We may share information with service providers that help us operate the service, such as providers used for authentication, hosting and infrastructure, email delivery and email receiving, payments and billing (if applicable), and analytics.</p><p>We do not sell personal information to advertisers.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">8. Third-party providers and processors</h2><ul className="list-disc space-y-1 pl-6"><li><strong>Clerk</strong> for authentication</li><li><strong>Resend</strong> for email delivery and related email operations</li><li>hosting and infrastructure providers used to run the product</li><li><strong>Google Analytics 4</strong> for analytics on the web experience</li><li>payment providers, if subscriptions or billing features are enabled</li></ul></section>
      <section><h2 className="mb-2 text-xl font-semibold">9. Data retention</h2><p>We retain personal information only for as long as reasonably necessary to provide the service, maintain account and product functionality, comply with legal obligations, resolve disputes, and enforce agreements.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">10. Data security</h2><p>We use reasonable technical and organizational safeguards designed to protect personal information. However, no system can guarantee absolute security.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">11. International data transfers</h2><p>Your information may be processed in countries other than your own, depending on where our service providers operate. When applicable, we take reasonable steps intended to provide appropriate safeguards for such transfers.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">12. Your rights</h2><ul className="list-disc space-y-1 pl-6"><li>access personal information we hold about you</li><li>request correction of inaccurate information</li><li>request deletion of your information</li><li>object to or restrict certain processing</li><li>withdraw consent where processing depends on consent</li></ul><p>To exercise privacy rights, contact: <strong>privacy@innerbloomjourney.org</strong></p></section>
      <section><h2 className="mb-2 text-xl font-semibold">13. Children</h2><p>Innerbloom is not directed to children under <strong>16 years of age</strong>.</p><p>If you believe that a child has provided personal information in violation of this policy, contact us at <strong>privacy@innerbloomjourney.org</strong>.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">14. Account deletion</h2><p>If you want to delete your account, use the deletion flow made available in the product or follow the instructions published on the Innerbloom account deletion page.</p><p>If you need help with deletion or another privacy request, contact <strong>support@innerbloomjourney.org</strong> or <strong>privacy@innerbloomjourney.org</strong>.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">15. Changes to this Privacy Policy</h2><p>We may update this Privacy Policy from time to time. When we do, we will update the “Last updated” date above. If a change is materially significant, we may provide additional notice where appropriate.</p></section>
      <section><h2 className="mb-2 text-xl font-semibold">16. Contact</h2><p>Privacy inquiries: <strong>privacy@innerbloomjourney.org</strong></p><p>Support inquiries: <strong>support@innerbloomjourney.org</strong></p></section>
    </LegalPageLayout>
  );
}
