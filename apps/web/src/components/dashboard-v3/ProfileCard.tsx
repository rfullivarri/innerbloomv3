import { CardSection } from '../ui/Card';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';
import { resolveAvatarMedia, type AvatarProfile } from '../../lib/avatarProfile';

interface ProfileCardProps {
  gameMode: GameMode | string | null;
  avatarProfile: AvatarProfile | null;
}

export function ProfileCard({ gameMode, avatarProfile }: ProfileCardProps) {
  const normalizedGameMode = normalizeGameModeValue(gameMode);
  const media = resolveAvatarMedia(avatarProfile, {
    rhythm: normalizedGameMode,
    surface: 'profile-card',
  });
  const videoSrc = media.videoUrl ?? '/avatars/flow-basic.mp4';

  return (
    <CardSection aria-label="Perfil">
      <div className="aspect-[5/6] w-full">
        <video
          src={videoSrc}
          aria-label={media.alt}
          className="h-full w-full rounded-ib-md object-cover shadow-lg"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>
    </CardSection>
  );
}
