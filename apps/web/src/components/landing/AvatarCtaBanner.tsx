import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AVATAR_OPTIONS, resolveAvatarPickerPreviewImage, type AvatarOption } from "../../lib/avatarCatalog";
import type { Language } from "../../content/officialLandingContent";
import "./AvatarCtaBanner.css";

type AvatarCtaBannerProps = {
  language: Language;
  startHref: string;
  className?: string;
};

type LocalizedAvatar = {
  option: AvatarOption;
  label: string;
  shortLabel: string;
};

const AVATAR_LABELS: Record<Language, Record<AvatarOption["code"], { label: string; shortLabel: string }>> = {
  es: {
    BLUE_AMPHIBIAN: { label: "Anfibio azul", shortLabel: "Anfibio" },
    GREEN_BEAR: { label: "Oso verde", shortLabel: "Oso" },
    RED_CAT: { label: "Gato rojo", shortLabel: "Gato" },
    VIOLET_OWL: { label: "Búho violeta", shortLabel: "Búho" },
  },
  en: {
    BLUE_AMPHIBIAN: { label: "Blue Amphibian", shortLabel: "Amphibian" },
    GREEN_BEAR: { label: "Green Bear", shortLabel: "Bear" },
    RED_CAT: { label: "Red Cat", shortLabel: "Cat" },
    VIOLET_OWL: { label: "Violet Owl", shortLabel: "Owl" },
  },
};

const COPY = {
  es: {
    kicker: "IDENTIDAD ADAPTATIVA",
    titleLead: "Comienza.",
    titleAccent: "Innerbloom adapta el resto.",
    body: "Selecciona el avatar que refleje cómo llegas hoy y ve como refleja tus emociones.",
    primary: "Comenzar",
    aria: "Avatares disponibles en Innerbloom",
  },
  en: {
    kicker: "ADAPTIVE IDENTITY",
    titleLead: "Begin.",
    titleAccent: "Innerbloom adapts the rest.",
    body: "Select the avatar that reflects how you show up today and see how it mirrors your emotions.",
    primary: "Start",
    aria: "Available Innerbloom avatars",
  },
} as const;

function getLocalizedAvatars(language: Language): LocalizedAvatar[] {
  return AVATAR_OPTIONS.map((option) => ({
    option,
    ...AVATAR_LABELS[language][option.code],
  }));
}

export function AvatarCtaBanner({
  language,
  startHref,
  className = "",
}: AvatarCtaBannerProps) {
  const copy = COPY[language];
  const avatars = getLocalizedAvatars(language);

  return (
    <section className={`avatar-cta-banner ${className}`} aria-labelledby="avatar-cta-title">
      <p className="avatar-cta-banner__kicker">{copy.kicker}</p>
      <div className="avatar-cta-banner__copy">
        <h2 id="avatar-cta-title" className="avatar-cta-banner__title">
          {copy.titleLead} <span>{copy.titleAccent}</span>
        </h2>
        <p className="avatar-cta-banner__body">{copy.body}</p>
        <div className="avatar-cta-banner__actions">
          <Link
            className="avatar-cta-banner__button"
            data-analytics-cta="start"
            data-analytics-location="avatar_cta"
            to={startHref}
          >
            {copy.primary}
          </Link>
        </div>
      </div>

      <div className="avatar-cta-banner__stage" aria-label={copy.aria}>
        <div className="avatar-cta-banner__deck">
          {avatars.map((avatar, index) => {
            const previewImage = resolveAvatarPickerPreviewImage(avatar.option);
            return (
              <article
                className="avatar-cta-card"
                key={avatar.option.code}
                style={
                  {
                    "--avatar-accent": avatar.option.accent,
                    "--avatar-index": index,
                  } as CSSProperties
                }
              >
                <div className="avatar-cta-card__imageWrap">
                  <img
                    src={previewImage}
                    alt={avatar.label}
                    className="avatar-cta-card__image"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </div>
                <div className="avatar-cta-card__footer">
                  <strong>{avatar.shortLabel}</strong>
                </div>
              </article>
            );
          })}
        </div>
        <div className="avatar-cta-banner__pips" aria-hidden>
          {avatars.map((avatar, index) => (
            <span key={avatar.option.code} style={{ "--avatar-index": index } as CSSProperties} />
          ))}
        </div>
      </div>
    </section>
  );
}
