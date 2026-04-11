import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';
import { useAuth } from '../auth/runtimeAuth';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { usePageMeta } from '../lib/seo';

const PRIVACY_EMAIL = 'privacy@innerbloomjourney.org';

const copy = {
  es: {
    title: 'Eliminar tu cuenta',
    description: 'Por seguridad, la eliminación se completa desde una sesión iniciada.',
    backHome: 'Volver al inicio',
    badge: 'Privacidad y datos',
    cardTitle: 'Cómo solicitar la eliminación',
    steps: [
      'Iniciá sesión con el email de la cuenta que querés eliminar.',
      'Abrí el menú personal dentro de la app.',
      'Al final del menú, debajo de Cerrar sesión, tocá Eliminar cuenta en rojo.',
      'Confirmá escribiendo ELIMINAR.',
    ],
    deleteScopeTitle: 'Qué se elimina',
    deleteScope:
      'Eliminamos tu cuenta, perfil, email, progreso, tareas, registros, emociones, recordatorios, preferencias y datos asociados. También eliminamos tu usuario de autenticación.',
    irreversibleTitle: 'Importante',
    irreversible:
      'La eliminación es permanente. No hay recuperación de cuenta ni de progreso después de confirmar.',
    primarySignedOut: 'Iniciar sesión para eliminar',
    primarySignedIn: 'Ir al menú de la app',
    contactPrefix: 'Si no podés acceder a tu cuenta, escribinos a',
  },
  en: {
    title: 'Delete your account',
    description: 'For security, deletion is completed from a signed-in session.',
    backHome: 'Back to home',
    badge: 'Privacy and data',
    cardTitle: 'How to request deletion',
    steps: [
      'Sign in with the email address for the account you want to delete.',
      'Open the personal menu inside the app.',
      'At the bottom of the menu, below Sign out, tap Delete account in red.',
      'Confirm by typing DELETE.',
    ],
    deleteScopeTitle: 'What gets deleted',
    deleteScope:
      'We delete your account, profile, email, progress, tasks, logs, emotions, reminders, preferences, and associated data. We also delete your authentication user.',
    irreversibleTitle: 'Important',
    irreversible:
      'Deletion is permanent. Account and progress recovery is not available after confirming.',
    primarySignedOut: 'Sign in to delete',
    primarySignedIn: 'Go to the app menu',
    contactPrefix: 'If you cannot access your account, contact us at',
  },
} as const;

export default function AccountDeletionPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const text = copy[language];
  const { userId } = useAuth();
  const isSignedIn = Boolean(userId);
  const primaryHref = isSignedIn ? DASHBOARD_PATH : buildLocalizedAuthPath('/login', language);

  usePageMeta({
    title: `${text.title} | Innerbloom`,
    description: text.description,
    image: 'https://innerbloomjourney.org/og/neneOGP.png',
    imageAlt: 'Innerbloom',
    url: 'https://innerbloomjourney.org/account-deletion',
  });

  return (
    <AuthLayout
      title={text.title}
      description={text.description}
      secondaryActionLabel={text.backHome}
      secondaryActionHref={`/?lang=${language}`}
    >
      <article className="w-full rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-6 text-left text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
          {text.badge}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          {text.cardTitle}
        </h2>

        <ol className="mt-5 space-y-3">
          {text.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-white/76">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <h3 className="text-sm font-semibold text-white">{text.deleteScopeTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-white/68">{text.deleteScope}</p>
        </section>

        <section className="mt-3 rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4">
          <h3 className="text-sm font-semibold text-rose-100">{text.irreversibleTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-rose-100/76">{text.irreversible}</p>
        </section>

        <a
          href={primaryHref}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.34)] transition hover:bg-[#8b5cf6]"
        >
          {isSignedIn ? text.primarySignedIn : text.primarySignedOut}
        </a>

        <p className="mt-5 text-center text-xs leading-5 text-white/50">
          {text.contactPrefix}{' '}
          <a className="font-semibold text-white/72 underline-offset-4 hover:text-white hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
      </article>
    </AuthLayout>
  );
}
