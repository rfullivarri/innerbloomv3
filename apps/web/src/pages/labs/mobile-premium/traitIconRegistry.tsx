import type { ReactElement, ReactNode, SVGProps } from 'react';

type TraitIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

type TraitIconKey =
  | 'sleep'
  | 'hydration'
  | 'nutrition'
  | 'mobility'
  | 'learning'
  | 'focus'
  | 'calm'
  | 'energy'
  | 'recovery'
  | 'hygiene'
  | 'vitality'
  | 'posture'
  | 'moderation'
  | 'creativity'
  | 'connection'
  | 'management'
  | 'selfControl'
  | 'resilience'
  | 'order'
  | 'projection'
  | 'finance'
  | 'agility'
  | 'purpose'
  | 'spirituality'
  | 'values'
  | 'altruism'
  | 'insight'
  | 'gratitude'
  | 'nature'
  | 'joy'
  | 'selfEsteem'
  | 'generic';

function BaseIcon({ size = 22, children, ...props }: TraitIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {children}
      </g>
    </svg>
  );
}

function MoonIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18.2 15.7A7.2 7.2 0 0 1 8.3 5.8 8 8 0 1 0 18.2 15.7Z" />
    </BaseIcon>
  );
}

function DropIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5S6.8 9 6.8 13.2a5.2 5.2 0 0 0 10.4 0C17.2 9 12 3.5 12 3.5Z" />
      <path d="M9.8 14.4a2.4 2.4 0 0 0 2.4 2.1" />
    </BaseIcon>
  );
}

function AppleIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12.1 7.5c1.5-1.2 3.6-1 4.7.3 1.5 1.8.8 5.6-.9 8.3-1 1.6-2.2 2.7-3.5 2.2-.8-.3-1.4-.3-2.2 0-1.3.5-2.5-.6-3.5-2.2-1.7-2.7-2.4-6.5-.9-8.3 1.1-1.3 3.2-1.5 4.7-.3.5.4 1.1.4 1.6 0Z" />
      <path d="M12 6.6c.1-1.7.9-2.8 2.6-3.4" />
    </BaseIcon>
  );
}

function MotionIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 17.6h11.2c2.4 0 3.9-1 4.8-3.1l.5-1.1-4.4.8-2.9-3.3-3.5 5.2H4Z" />
      <path d="M6 12.4h3.2" />
      <path d="M4.5 9.3h5.8" />
    </BaseIcon>
  );
}

function BookIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 5.3h5.2c1 0 1.8.8 1.8 1.8v12.1c0-1-.8-1.8-1.8-1.8H5V5.3Z" />
      <path d="M19 5.3h-5.2c-1 0-1.8.8-1.8 1.8v12.1c0-1 .8-1.8 1.8-1.8H19V5.3Z" />
    </BaseIcon>
  );
}

function TargetIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3" />
      <path d="M21.2 12h-3" />
    </BaseIcon>
  );
}

function CalmIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9.5c2.2-2.1 4.4-2.1 6.6 0s4.4 2.1 6.6 0" />
      <path d="M4 14.5c2.2-2.1 4.4-2.1 6.6 0s4.4 2.1 6.6 0" />
    </BaseIcon>
  );
}

function EnergyIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M13 2.8 5.7 13h5.8L11 21.2 18.3 11h-5.8L13 2.8Z" />
    </BaseIcon>
  );
}

function SparkIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4.5 13.7 9l4.6 1.7-4.6 1.7L12 17l-1.7-4.6-4.6-1.7L10.3 9 12 4.5Z" />
    </BaseIcon>
  );
}

function ConnectionIcon(props: TraitIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="7.2" cy="12" r="3.2" />
      <circle cx="16.8" cy="12" r="3.2" />
      <path d="M10.4 12h3.2" />
    </BaseIcon>
  );
}

function RecoveryIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M5 12a7 7 0 1 0 2.1-5" /><path d="M5 5.5v5h5" /></BaseIcon>;
}

function HygieneIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M8 4h8v4H8zM7 8h10l1 12H6L7 8Z" /><path d="M9.5 12h5M10 16h4" /></BaseIcon>;
}

function VitalityIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M3.5 12h4l2-5 4 10 2-5h5" /></BaseIcon>;
}

function PostureIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="4.5" r="2" /><path d="M12 7v6m0 0-4 7m4-7 5 5m-5-8 5 2" /></BaseIcon>;
}

function ModerationIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M4 17h16M6 17l2-9h8l2 9M9 8l3-4 3 4" /></BaseIcon>;
}

function ManagementIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M5 5h14v14H5zM8 9h8M8 13h5" /></BaseIcon>;
}

function SelfControlIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M12 3 5.5 6v5c0 4.3 2.6 7.7 6.5 10 3.9-2.3 6.5-5.7 6.5-10V6L12 3Z" /><path d="m9 12 2 2 4-5" /></BaseIcon>;
}

function ResilienceIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M6 18c0-7 3-11 10-12-1 7-5 10-10 12Z" /><path d="M6 18c3-4 6-6 10-8" /></BaseIcon>;
}

function OrderIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M7 6h13M7 12h13M7 18h13" /><circle cx="4" cy="6" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="4" cy="18" r=".8" /></BaseIcon>;
}

function ProjectionIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M4 18 18 4M10 4h8v8" /><path d="M4 10v8h8" /></BaseIcon>;
}

function FinanceIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="8" /><path d="M15 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1.3 1.8 3 2 3 .8 3 2-1.3 2-3 2c-1.2 0-2.3-.4-3-1M12 5.5v13" /></BaseIcon>;
}

function AgilityIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M4 8h10M4 12h7M4 16h4M15 7l5 5-5 5" /></BaseIcon>;
}

function PurposeIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m14 10 6-6" /></BaseIcon>;
}

function SpiritualityIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M12 20c-4-3-6-6-6-9 3 0 5 1 6 3 1-2 3-3 6-3 0 3-2 6-6 9Z" /><path d="M12 14V5" /></BaseIcon>;
}

function ValuesIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M12 20S5 16 5 10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6-7 10-7 10Z" /></BaseIcon>;
}

function AltruismIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M4 13h5l3 3 3-3h5" /><path d="M7 13V8a3 3 0 0 1 5-2 3 3 0 0 1 5 2v5" /></BaseIcon>;
}

function InsightIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M9 18h6M10 21h4" /><path d="M8 14a6 6 0 1 1 8 0c-1 .7-1 1.5-1 2H9c0-.5 0-1.3-1-2Z" /></BaseIcon>;
}

function GratitudeIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M12 3l2.2 5.2L20 10l-4.5 3.6.2 5.9L12 16.3l-3.7 3.2.2-5.9L4 10l5.8-1.8L12 3Z" /></BaseIcon>;
}

function NatureIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><path d="M5 19c0-8 4-13 14-14-1 10-6 14-14 14Z" /><path d="M5 19c4-5 8-8 14-11" /></BaseIcon>;
}

function JoyIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="8" /><path d="M8.5 10h.01M15.5 10h.01M8.5 14c2.2 2 4.8 2 7 0" /></BaseIcon>;
}

function SelfEsteemIcon(props: TraitIconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="8" r="3" /><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6" /><path d="m18 5 .7 1.5L20 7l-1.3.5L18 9l-.7-1.5L16 7l1.3-.5L18 5Z" /></BaseIcon>;
}

export const traitIconRegistry: Record<TraitIconKey, (props: TraitIconProps) => ReactElement> = {
  sleep: MoonIcon,
  hydration: DropIcon,
  nutrition: AppleIcon,
  mobility: MotionIcon,
  learning: BookIcon,
  focus: TargetIcon,
  calm: CalmIcon,
  energy: EnergyIcon,
  recovery: RecoveryIcon,
  hygiene: HygieneIcon,
  vitality: VitalityIcon,
  posture: PostureIcon,
  moderation: ModerationIcon,
  creativity: SparkIcon,
  connection: ConnectionIcon,
  management: ManagementIcon,
  selfControl: SelfControlIcon,
  resilience: ResilienceIcon,
  order: OrderIcon,
  projection: ProjectionIcon,
  finance: FinanceIcon,
  agility: AgilityIcon,
  purpose: PurposeIcon,
  spirituality: SpiritualityIcon,
  values: ValuesIcon,
  altruism: AltruismIcon,
  insight: InsightIcon,
  gratitude: GratitudeIcon,
  nature: NatureIcon,
  joy: JoyIcon,
  selfEsteem: SelfEsteemIcon,
  generic: SparkIcon,
};

const TRAIT_ALIASES: Record<string, TraitIconKey> = {
  sueno: 'sleep',
  sueño: 'sleep',
  sleep: 'sleep',
  hidratacion: 'hydration',
  hidratación: 'hydration',
  hydration: 'hydration',
  agua: 'hydration',
  nutricion: 'nutrition',
  nutrición: 'nutrition',
  nutrition: 'nutrition',
  food: 'nutrition',
  movilidad: 'mobility',
  mobility: 'mobility',
  movement: 'mobility',
  aprendizaje: 'learning',
  learning: 'learning',
  lectura: 'learning',
  focus: 'focus',
  foco: 'focus',
  enfoque: 'focus',
  calma: 'calm',
  calm: 'calm',
  regulacion: 'calm',
  regulación: 'calm',
  energia: 'energy',
  energía: 'energy',
  energy: 'energy',
  recuperacion: 'recovery',
  recuperación: 'recovery',
  recovery: 'recovery',
  higiene: 'hygiene',
  hygiene: 'hygiene',
  vitalidad: 'vitality',
  vitality: 'vitality',
  postura: 'posture',
  posture: 'posture',
  moderacion: 'moderation',
  moderation: 'moderation',
  creatividad: 'creativity',
  creativity: 'creativity',
  conexion: 'connection',
  conexión: 'connection',
  connection: 'connection',
  gestion: 'management',
  management: 'management',
  autocontrol: 'selfControl',
  selfcontrol: 'selfControl',
  resiliencia: 'resilience',
  resilience: 'resilience',
  orden: 'order',
  order: 'order',
  proyeccion: 'projection',
  projection: 'projection',
  finanzas: 'finance',
  finance: 'finance',
  agilidad: 'agility',
  agility: 'agility',
  proposito: 'purpose',
  purpose: 'purpose',
  espiritualidad: 'spirituality',
  spirituality: 'spirituality',
  valores: 'values',
  values: 'values',
  altruismo: 'altruism',
  altruism: 'altruism',
  insight: 'insight',
  gratitud: 'gratitude',
  gratitude: 'gratitude',
  naturaleza: 'nature',
  nature: 'nature',
  gozo: 'joy',
  joy: 'joy',
  autoestima: 'selfEsteem',
  selfesteem: 'selfEsteem',
};

function normalizeTrait(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function resolveTraitIconKey(value: string | null | undefined): TraitIconKey {
  const normalized = normalizeTrait(value);
  return TRAIT_ALIASES[normalized] ?? 'generic';
}

export function TraitIcon({
  trait,
  size = 22,
  className,
}: {
  trait?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = traitIconRegistry[resolveTraitIconKey(trait)];
  return <Icon className={className} size={size} />;
}
