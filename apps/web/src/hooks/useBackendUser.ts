import { useAuth } from '@clerk/clerk-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUserProfile,
  isApiAuthTokenProviderReady,
  onApiAuthTokenProviderChange,
  type CurrentUserProfile,
} from '../lib/api';
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
  const { userId: clerkUserId, isSignedIn } = useAuth();
  const [isAuthReady, setIsAuthReady] = useState(isApiAuthTokenProviderReady());

  useEffect(() => {
    setIsAuthReady(isApiAuthTokenProviderReady());
    return onApiAuthTokenProviderChange((provider) => {
      setIsAuthReady(Boolean(provider));
    });
  }, []);

  const enabled = Boolean(isSignedIn && clerkUserId && isAuthReady);

  const requestFactory = useCallback(() => {
    if (!clerkUserId) {
      return Promise.reject<CurrentUserProfile>(new Error('Missing Clerk user ID'));
    }

    console.info('[API] /users/me signedIn:', isSignedIn, 'userId:', clerkUserId);
    return getCurrentUserProfile();
  }, [clerkUserId, isSignedIn]);

  const { data, status, error, reload } = useRequest(
    requestFactory,
    [requestFactory],
    { enabled },
  );

  const normalizedStatus: AsyncStatus = enabled ? status : 'loading';
  const profile = enabled && status === 'success' ? data : null;
  const backendUserId = profile?.user_id ?? null;

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
