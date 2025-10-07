import { CardSection } from '../ui/Card';

interface ProfileCardProps {
  imageUrl?: string | null;
}

export function ProfileCard({ imageUrl }: ProfileCardProps) {
  const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

  return (
    <CardSection aria-label="Perfil">
      <div className="aspect-[5/6] w-full">
        {hasImage ? (
          <img
            src={imageUrl ?? ''}
            alt="Avatar"
            className="h-full w-full rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/10 text-5xl text-slate-200">
            👤
          </div>
        )}
      </div>
    </CardSection>
  );
}
