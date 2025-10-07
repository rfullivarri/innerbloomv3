import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { getCurrentUserProfile, type CurrentUserProfile } from '../lib/api';
import { useRequest, type AsyncStatus } from './useRequest';

export type BackendUserState = {
  clerkUserId: string | null;
  backendUserId: string | null;
  profile: CurrentUserProfile | null;
  status: AsyncStatus;
  error: Error | null;
  reload: () => void;
};

export function useBackendUser(): BackendUserState {
  const { userId: clerkUserId } = useAuth();
  const enabled = Boolean(clerkUserId);

  const { data, status, error, reload } = useRequest(
    () => getCurrentUserProfile(clerkUserId!),
    [clerkUserId],
    { enabled },
  );

  const normalizedStatus: AsyncStatus = enabled ? status : 'idle';
  const profile = enabled && status === 'success' ? data : null;
  const backendUserId = profile?.id ?? null;

  return useMemo(
    () => ({
      clerkUserId: clerkUserId ?? null,
      backendUserId,
      profile,
      status: normalizedStatus,
      error: enabled ? error : null,
      reload,
    }),
    [backendUserId, clerkUserId, enabled, error, normalizedStatus, profile, reload],
  );
}
