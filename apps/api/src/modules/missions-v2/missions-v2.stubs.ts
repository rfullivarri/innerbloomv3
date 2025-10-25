import {
  type MissionsV2BoardResponse,
  type MissionsV2ClaimResponse,
  type MissionsV2HeartbeatResponse,
  type MissionsV2MarketResponse,
  type MissionsV2MarketProposal,
  type MissionsV2MarketSlot,
  type MissionsV2Slot,
  type MissionsV2SlotKey,
} from '@innerbloom/missions-v2-contracts';

const SEASON_ID = 'season-aurora-2024';
const CLAIM_URL = '/dashboard-v3/missions-v2';

const now = () => new Date();

function iso(date: Date): string {
  return date.toISOString();
}

function computePercent(current: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function createSlot(
  slotKey: MissionsV2SlotKey,
  options: {
    id: string;
    mission: Exclude<MissionsV2Slot['mission'], null> | null;
    state: MissionsV2Slot['state'];
    petals: { total: number; remaining: number };
    heartbeatToday: boolean;
    progress: { current: number; target: number };
    countdown: { endsInHours: number; label: string } | { endsInHours: null; label: string };
    actions: MissionsV2Slot['actions'];
    claim: MissionsV2Slot['claim'];
  },
): MissionsV2Slot {
  const endsAt =
    options.countdown.endsInHours == null
      ? null
      : iso(new Date(now().getTime() + options.countdown.endsInHours * 60 * 60 * 1000));
  return {
    id: options.id,
    slot: slotKey,
    mission: options.mission,
    state: options.state,
    petals: options.petals,
    heartbeat_today: options.heartbeatToday,
    progress: {
      current: options.progress.current,
      target: options.progress.target,
      percent: computePercent(options.progress.current, options.progress.target),
    },
    countdown: {
      ends_at: endsAt,
      label: options.countdown.label,
    },
    actions: options.actions,
    claim: options.claim,
  };
}

const marketBase: MissionsV2MarketSlot[] = [
  {
    slot: 'main',
    proposals: [
      {
        id: 'mission-main-001',
        slot: 'main',
        name: 'Guardianes del Bloom',
        summary: 'Defiende la flor central completando tareas coordinadas.',
        requirements: 'Completar briefing semanal · Equipo de 3 agentes',
        objective: 'Resistir tres oleadas de amenazas al núcleo.',
        objectives: [
          'Completar la ronda de reconocimiento',
          'Entregar reporte de vulnerabilidades',
          'Coordinar defensa con el squad',
        ],
        reward: { xp: 450, currency: 120, items: ['Llave Prisma'] },
        difficulty: 'high',
        tags: ['story', 'team'],
        metadata: { spotlight: true, boosterMultiplier: 1.5 },
        duration_days: 5,
        locked: true,
        isActive: true,
        available_at: iso(new Date(now().getTime() + 12 * 60 * 60 * 1000)),
      },
      {
        id: 'mission-main-002',
        slot: 'main',
        name: 'Custodia del Archivo',
        summary: 'Recuperá documentos históricos antes de que se desvanezcan.',
        requirements: 'Investigar sala de archivos · Desbloquear cofres',
        objective: 'Obtener tres reliquias únicas del archivo.',
        objectives: [
          'Descifrar el panel ancestral',
          'Conseguir la reliquia solar',
          'Reportar hallazgos en canal #missions',
        ],
        reward: { xp: 380, currency: 95, items: ['Papiro Antiguo'] },
        difficulty: 'medium',
        tags: ['exploration'],
        metadata: { boosterMultiplier: 1.25, stat: 'wisdom' },
        duration_days: 4,
        locked: false,
        isActive: false,
        available_at: null,
      },
      {
        id: 'mission-main-003',
        slot: 'main',
        name: 'Frente a la Tormenta',
        summary: 'Dirigí la defensa durante la tormenta de fragmentos.',
        requirements: 'Coordinar brigadas · Activar escudos temporales',
        objective: 'Mantener los escudos activos por cuatro turnos.',
        objectives: [
          'Revisar el radar intermitente',
          'Anclar dos generadores de energía',
          'Emitir reporte de estabilidad',
        ],
        reward: { xp: 520, currency: 140, items: ['Fragmento Estelar'] },
        difficulty: 'epic',
        tags: ['challenge', 'timed'],
        metadata: { spotlight: false, boosterMultiplier: 1.7 },
        duration_days: 6,
        locked: false,
        isActive: false,
        available_at: null,
      },
    ],
  },
  {
    slot: 'hunt',
    proposals: [
      {
        id: 'mission-hunt-001',
        slot: 'hunt',
        name: 'Rastreo Fantasma',
        summary: 'Sigue las huellas digitales en el distrito olvidado.',
        requirements: 'Analizar 3 pistas · Operar en modo sigiloso',
        objective: 'Descubrir quién alteró los registros nocturnos.',
        objectives: [
          'Investigar cámaras del distrito',
          'Detectar patrones anómalos',
          'Capturar evidencia principal',
        ],
        reward: { xp: 260, currency: 70, items: ['Sensor Ámbar'] },
        difficulty: 'medium',
        tags: ['stealth'],
        metadata: { stat: 'perception' },
        duration_days: 3,
        locked: true,
        isActive: true,
        available_at: iso(new Date(now().getTime() + 6 * 60 * 60 * 1000)),
      },
      {
        id: 'mission-hunt-002',
        slot: 'hunt',
        name: 'Sendero Inverso',
        summary: 'Recrea los pasos de un agente perdido.',
        requirements: 'Recolectar firmas · Revisar testimonios',
        objective: 'Volver a trazar el mapa de desplazamiento.',
        objectives: ['Levantar mapa 3D', 'Analizar señalización', 'Confirmar paradero final'],
        reward: { xp: 310, currency: 80, items: ['Mapa Prismático'] },
        difficulty: 'high',
        tags: ['investigation'],
        metadata: { boosterMultiplier: 1.35 },
        duration_days: 4,
        locked: false,
        isActive: false,
        available_at: null,
      },
      {
        id: 'mission-hunt-003',
        slot: 'hunt',
        name: 'Eco Nocturno',
        summary: 'Intercepta transmisiones que cruzan la frontera oscura.',
        requirements: 'Sincronizar antenas · Mantener sigilo',
        objective: 'Mapear la red clandestina antes del amanecer.',
        objectives: ['Reparar antena oeste', 'Decodificar señal beta', 'Emitir alerta final'],
        reward: { xp: 285, currency: 75, items: ['Chip Resonante'] },
        difficulty: 'medium',
        tags: ['signal'],
        metadata: { stat: 'intuition' },
        duration_days: 3,
        locked: false,
        isActive: false,
        available_at: null,
      },
    ],
  },
  {
    slot: 'skill',
    proposals: [
      {
        id: 'mission-skill-001',
        slot: 'skill',
        name: 'Forja de Sincronía',
        summary: 'Optimiza tus habilidades en el laboratorio comunitario.',
        requirements: 'Aprobar taller base · Presentar prototipo',
        objective: 'Completar tres módulos de la forja colaborativa.',
        objectives: ['Diseñar blueprint inicial', 'Iterar mejoras', 'Exponer el resultado'],
        reward: { xp: 210, currency: 55, items: ['Catalizador Lunar'] },
        difficulty: 'medium',
        tags: ['crafting'],
        metadata: { stat: 'creation' },
        duration_days: 3,
        locked: false,
        isActive: false,
        available_at: null,
      },
      {
        id: 'mission-skill-002',
        slot: 'skill',
        name: 'Bitácora de Maestría',
        summary: 'Documenta y enseña un truco avanzado a la comunidad.',
        requirements: 'Registrar video · Compartir aprendizajes',
        objective: 'Publicar guía con tres ejemplos prácticos.',
        objectives: ['Planificar guion', 'Grabar demostración', 'Publicar entrega final'],
        reward: { xp: 240, currency: 60, items: ['Glifo Instruccional'] },
        difficulty: 'high',
        tags: ['teaching'],
        metadata: { boosterMultiplier: 1.2 },
        duration_days: 5,
        locked: false,
        isActive: false,
        available_at: null,
      },
      {
        id: 'mission-skill-003',
        slot: 'skill',
        name: 'Simulación Aurora',
        summary: 'Ejecuta la simulación estratégica de la temporada Aurora.',
        requirements: 'Completar tutorial · Coordinar con dos agentes',
        objective: 'Obtener una puntuación perfecta en la simulación.',
        objectives: ['Revisar briefing táctico', 'Calibrar indicadores', 'Compartir conclusiones'],
        reward: { xp: 280, currency: 70, items: ['Módulo Aurora'] },
        difficulty: 'epic',
        tags: ['simulation'],
        metadata: { spotlight: true },
        duration_days: 4,
        locked: false,
        isActive: false,
        available_at: null,
      },
    ],
  },
];

function cloneMarket(): MissionsV2MarketSlot[] {
  return marketBase.map((slot: MissionsV2MarketSlot) => ({
    slot: slot.slot,
    proposals: slot.proposals.map((proposal: MissionsV2MarketProposal) => ({ ...proposal })),
  }));
}

function buildBoardSlots(): MissionsV2Slot[] {
  const baseMarket = cloneMarket();
  const mainActive = baseMarket[0]?.proposals[0];
  const huntActive = baseMarket[1]?.proposals[0];

  const skillMission = {
    id: 'mission-skill-000',
    name: 'Bitácora de Ensayo',
    type: 'skill' as const,
    summary: 'Completá los módulos introductorios del taller cooperativo.',
    requirements: 'Ver tutorial inicial · Reservar laboratorio',
    objective: 'Iterar un prototipo funcional junto al mentor asignado.',
    objectives: ['Configurar estación', 'Ejecutar prueba base', 'Entregar feedback'],
    reward: { xp: 180, currency: 45, items: ['Token Beta'] },
    tasks: [
      { id: 'mission-skill-000-task-1', name: 'Configurar estación', tag: 'setup' },
      { id: 'mission-skill-000-task-2', name: 'Ejecutar prueba base', tag: 'test' },
      { id: 'mission-skill-000-task-3', name: 'Registrar feedback', tag: 'feedback' },
    ],
    tags: ['skill-route'],
    metadata: { stat: 'creation' },
  };

  const mainSlot = createSlot('main', {
    id: 'slot-main-aurora',
    mission: mainActive
      ? {
          id: mainActive.id,
          name: mainActive.name,
          type: 'main',
          summary: mainActive.summary,
          requirements: mainActive.requirements,
          objective: mainActive.objective,
          objectives: [...mainActive.objectives],
          reward: { ...mainActive.reward },
          tasks: [
            { id: `${mainActive.id}-task-1`, name: 'Coordinar defensa', tag: 'coordination' },
            { id: `${mainActive.id}-task-2`, name: 'Sellar primer pétalo', tag: 'action' },
          ],
          tags: mainActive.tags,
          metadata: mainActive.metadata,
        }
      : null,
    state: 'active',
    petals: { total: 5, remaining: 3 },
    heartbeatToday: false,
    progress: { current: 2, target: 5 },
    countdown: { endsInHours: 48, label: 'Termina en 2 días' },
    actions: [
      { id: 'slot-main-aurora:heartbeat', type: 'heartbeat', label: 'Registrar Heartbeat', enabled: true },
      { id: 'slot-main-aurora:link', type: 'link_daily', label: 'Vincular Daily', enabled: true },
      { id: 'slot-main-aurora:claim', type: 'claim', label: 'Reclamar botín', enabled: false },
    ],
    claim: { available: false, enabled: false, cooldown_until: null },
  });

  const huntSlot = createSlot('hunt', {
    id: 'slot-hunt-aurora',
    mission: huntActive
      ? {
          id: huntActive.id,
          name: huntActive.name,
          type: 'hunt',
          summary: huntActive.summary,
          requirements: huntActive.requirements,
          objective: huntActive.objective,
          objectives: [...huntActive.objectives],
          reward: { ...huntActive.reward },
          tasks: [
            { id: `${huntActive.id}-task-1`, name: 'Analizar pistas', tag: 'analysis' },
            { id: `${huntActive.id}-task-2`, name: 'Capturar evidencia', tag: 'capture' },
          ],
          tags: huntActive.tags,
          metadata: huntActive.metadata,
        }
      : null,
    state: 'succeeded',
    petals: { total: 6, remaining: 6 },
    heartbeatToday: true,
    progress: { current: 6, target: 6 },
    countdown: { endsInHours: 1, label: 'Listo para reclamar' },
    actions: [
      { id: 'slot-hunt-aurora:heartbeat', type: 'heartbeat', label: 'Heartbeat registrado', enabled: false },
      { id: 'slot-hunt-aurora:claim', type: 'claim', label: 'Abrir cofre', enabled: true },
    ],
    claim: { available: true, enabled: true, cooldown_until: null },
  });

  const skillSlot = createSlot('skill', {
    id: 'slot-skill-aurora',
    mission: skillMission,
    state: 'cooldown',
    petals: { total: 4, remaining: 1 },
    heartbeatToday: false,
    progress: { current: 4, target: 4 },
    countdown: { endsInHours: null, label: 'Cooldown: 12h restantes' },
    actions: [
      { id: 'slot-skill-aurora:heartbeat', type: 'heartbeat', label: 'Esperando cooldown', enabled: false },
      { id: 'slot-skill-aurora:abandon', type: 'abandon', label: 'Abandonar misión', enabled: false },
    ],
    claim: { available: false, enabled: false, cooldown_until: iso(new Date(now().getTime() + 12 * 60 * 60 * 1000)) },
  });

  return [mainSlot, huntSlot, skillSlot];
}

export function createMissionsV2BoardResponse(): MissionsV2BoardResponse {
  return {
    season_id: SEASON_ID,
    generated_at: iso(now()),
    slots: buildBoardSlots(),
    boss: {
      id: 'boss-aurora-001',
      name: 'Centinela de Cristal',
      status: 'ready',
      description: 'Coordina golpes especiales para romper el escudo del jefe estacional.',
      countdown: {
        ends_at: iso(new Date(now().getTime() + 4 * 60 * 60 * 1000)),
        label: 'Escudo vulnerable por 4h',
      },
      actions: [
        { id: 'boss-phase2', type: 'special_strike', label: 'Activar Fase 2', enabled: true },
        { id: 'boss-submit-evidence', type: 'submit_evidence', label: 'Enviar evidencia', enabled: true },
      ],
    },
    gating: { claim_url: CLAIM_URL },
    communications: [
      {
        id: 'comm-seasonal-aurora',
        type: 'seasonal',
        message: 'Semana Aurora · Protegé los pétalos para desbloquear el ritual final.',
      },
      {
        id: 'comm-daily-heartbeat',
        type: 'daily',
        message: 'Recordatorio: Heartbeat disponible en Main Quest.',
      },
    ],
    market: cloneMarket(),
  };
}

export function createMissionsV2MarketResponse(): MissionsV2MarketResponse {
  return { market: cloneMarket() };
}

export function createMissionsV2HeartbeatResponse(): MissionsV2HeartbeatResponse {
  return {
    status: 'ok',
    petals_remaining: 3,
    heartbeat_date: iso(now()),
  };
}

export function createMissionsV2ClaimResponse(): MissionsV2ClaimResponse {
  return {
    board: createMissionsV2BoardResponse(),
    rewards: {
      xp: 320,
      currency: 90,
      items: ['Cofre de Cristal'],
    },
  };
}
