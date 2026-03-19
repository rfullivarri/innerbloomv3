import type { OnboardingOverlayScope } from './onboardingOverlayStorage';

type OnboardingOverlayScopeSource =
  | {
      user_id: string;
      onboarding_session_id: string | null;
    }
  | null
  | undefined;

export function buildOnboardingOverlayScope(
  source: OnboardingOverlayScopeSource,
): OnboardingOverlayScope | null {
  const userId = source?.user_id?.trim();
  const onboardingSessionId = source?.onboarding_session_id?.trim();

  if (!userId || !onboardingSessionId) {
    return null;
  }

  return {
    userId,
    onboardingSessionId,
  };
}
