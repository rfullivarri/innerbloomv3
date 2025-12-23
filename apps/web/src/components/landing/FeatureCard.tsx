import type { CSSProperties, ReactNode } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  preview: ReactNode;
  delay?: number;
}

export function FeatureCard({ title, description, preview, delay = 0 }: FeatureCardProps) {
  return (
    <article
      className="feature-card fade-item"
      style={{ '--delay': `${delay}ms` } as CSSProperties}
    >
      <div className="feature-card__header">
        <h3 className="feature-card__title">{title}</h3>
        <p className="feature-card__description">{description}</p>
      </div>
      <div className="feature-card__preview" aria-hidden={false}>
        {preview}
      </div>
    </article>
  );
}
