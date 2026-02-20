import { CardSection } from '../ui/Card';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';

interface ProfileCardProps {
  gameMode: GameMode | string | null;
}

const MODE_VIDEO_BY_GAME_MODE: Record<GameMode, string> = {
  Low: '/avatars/low-basic.mp4',
  Chill: '/avatars/chill-basic.mp4',
  Flow: '/avatars/flow-basic.mp4',
  Evolve: '/avatars/evolve-basic.mp4',
};

export function ProfileCard({ gameMode }: ProfileCardProps) {
  const normalizedGameMode = normalizeGameModeValue(gameMode);
  const videoSrc = MODE_VIDEO_BY_GAME_MODE[normalizedGameMode ?? 'Flow'];

  return (
    <CardSection aria-label="Perfil">
      <div className="aspect-[5/6] w-full">
        <video
          src={videoSrc}
          aria-label={`Avatar animado modo ${normalizedGameMode ?? 'Flow'}`}
          className="h-full w-full rounded-2xl object-cover shadow-lg"
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
