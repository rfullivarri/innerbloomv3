import { useMemo } from 'react';
import { MissionsV2Board } from '../components/dashboard-v3/MissionsV2Board';
import { DEV_USER_SWITCH_OPTIONS, getDevUserOverride } from '../lib/api';

export default function DevMissionsPage() {
  const initialUserId = useMemo(() => getDevUserOverride() ?? DEV_USER_SWITCH_OPTIONS[0]?.id ?? 'user_demo_active', []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-3 py-4 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <MissionsV2Board userId={initialUserId} />
      </div>
    </div>
  );
}
