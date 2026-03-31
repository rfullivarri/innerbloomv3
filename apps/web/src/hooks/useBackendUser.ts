import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/runtimeAuth';
import {
  getCurrentUserProfile,
  isApiAuthTokenProviderReady,
  onApiAuthTokenProviderChange,
  type CurrentUserProfile,
} from '../lib/api';
import { isNativeCapacitorPlatform } from '../mobile/capacitor';
import { useMobileAuthSession } from '../mobile/mobileAuthSession';
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
  const mobileAuthSession = useMobileAuthSession();
  const isNativeApp = isNativeCapacitorPlatform();
  const hasNativeCallbackSession = isNativeApp && Boolean(mobileAuthSession?.token);
  const effectiveClerkUserId = clerkUserId ?? mobileAuthSession?.clerkUserId ?? null;
  const [isAuthReady, setIsAuthReady] = useState(isApiAuthTokenProviderReady());

  useEffect(() => {
    setIsAuthReady(isApiAuthTokenProviderReady());
    return onApiAuthTokenProviderChange((provider) => {
      setIsAuthReady(Boolean(provider));
    });
  }, []);

  const enabled = Boolean(isAuthReady && (isSignedIn || hasNativeCallbackSession));

  const requestFactory = useCallback(() => {
    console.info('[API] /users/me auth context', {
      isSignedIn,
      isNativeApp,
      hasNativeCallbackSession,
      clerkUserId: effectiveClerkUserId,
    });
    return getCurrentUserProfile();
  }, [effectiveClerkUserId, hasNativeCallbackSession, isNativeApp, isSignedIn]);

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
      clerkUserId: effectiveClerkUserId,
      backendUserId,
      profile,
      status: normalizedStatus,
      error: enabled ? error : null,
      reload,
    }),
    [backendUserId, effectiveClerkUserId, enabled, error, normalizedStatus, profile, reload],
  );
}
