import { UserProfile } from '@clerk/clerk-react';

export default function MobileAccountSettings() {
  return (
    <main className="min-h-screen bg-[#05070b] px-3 py-8 text-white">
      <UserProfile routing="hash" />
    </main>
  );
}
