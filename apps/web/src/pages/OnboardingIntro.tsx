import { IntroJourney } from '../onboarding/IntroJourney';
import { buildPayload } from '../onboarding/payload';
import { OnboardingProvider } from '../onboarding/state';

export default function OnboardingIntroPage() {
  const handleFinish = (payload: ReturnType<typeof buildPayload>) => {
    console.log('[onboarding] finish payload', payload);
  };

  return (
    <OnboardingProvider>
      <IntroJourney onFinish={handleFinish} />
    </OnboardingProvider>
  );
}
