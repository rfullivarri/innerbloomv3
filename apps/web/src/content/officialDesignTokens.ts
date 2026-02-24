export const OFFICIAL_DESIGN_TOKENS = {
  palette: {
    bg: '#0B1220',
    bgAlt: '#0F1A2E',
    surface: '#111F35',
    text: '#EAF1FF',
    muted: '#9FB6E3',
    primary: '#8B5CF6',
    secondary: '#38BDF8',
    accent: '#22D3EE',
    border: '#3B82F6',
    moods: {
      low: '#FB7185',
      chill: '#34D399',
      flow: '#38BDF8',
      evolve: '#8B5CF6'
    }
  },
  typography: {
    headingFamily: "Sora, Segoe UI, system-ui, sans-serif",
    bodyFamily: "Manrope, Segoe UI, system-ui, sans-serif",
    headingLetterSpacing: '-0.015em',
    weights: [400, 500, 600, 700, 800]
  },
  spacing: {
    base: '8px',
    sectionVertical: '64px',
    containerMax: '1080px'
  },
  radius: {
    sm: '10px',
    md: '16px',
    lg: '20px',
    pill: '9999px'
  },
  shadows: {
    card: '0 18px 40px rgba(0,0,0,0.35)',
    onboardingGlass: '0 26px 80px rgba(12, 18, 38, 0.24)'
  },
  gradients: [
    {
      name: 'landing_background_core',
      type: 'multi-layer',
      angle: '140deg',
      stops: ['rgba(56,189,248,0.16)', 'rgba(139,92,246,0.14)', 'rgba(14,165,233,0.12)', 'rgba(59,130,246,0.08)']
    },
    {
      name: 'purple_paradise',
      type: 'linear',
      angle: '135deg',
      stops: ['#1d2b64', '#f8cdda']
    },
    {
      name: 'color_1',
      type: 'linear',
      angle: '135deg',
      stops: ['#ff512f', '#dd2476']
    },
    {
      name: 'color_2',
      type: 'linear',
      angle: '135deg',
      stops: ['#348f50', '#56b4d3']
    },
    {
      name: 'purple_love',
      type: 'linear',
      angle: '135deg',
      stops: ['#cc2b5e', '#753a88']
    },
    {
      name: 'afternoon',
      type: 'linear',
      angle: '135deg',
      stops: ['#000c40', '#607d8b']
    }
  ],
  cssVariablesMapped: [
    '--color-surface',
    '--color-surface-muted',
    '--color-surface-elevated',
    '--color-text',
    '--color-text-muted',
    '--color-text-subtle',
    '--color-accent-primary',
    '--color-accent-secondary'
  ]
} as const;

export const OFFICIAL_LANDING_CSS_VARIABLES: Record<string, string> = {
  '--font-heading': "'Sora', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  '--font-body': "'Manrope', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  '--bg': OFFICIAL_DESIGN_TOKENS.palette.bg,
  '--bg-2': OFFICIAL_DESIGN_TOKENS.palette.bgAlt,
  '--card': OFFICIAL_DESIGN_TOKENS.palette.surface,
  '--ink': OFFICIAL_DESIGN_TOKENS.palette.text,
  '--muted': 'color-mix(in srgb, #d6e5ff 72%, #9fb6e3 28%)',
  '--accent': 'var(--color-accent-secondary)',
  '--accent-2': 'var(--color-accent-primary)',
  '--line': 'color-mix(in srgb, var(--color-accent-primary) 24%, transparent)',
  '--fluid-bg': '#0f172a',
  '--fluid-c1': OFFICIAL_DESIGN_TOKENS.palette.secondary,
  '--fluid-c2': OFFICIAL_DESIGN_TOKENS.palette.primary,
  '--fluid-c3': OFFICIAL_DESIGN_TOKENS.palette.accent,
  '--fluid-c4': '#a5b4fc',
  '--low': OFFICIAL_DESIGN_TOKENS.palette.moods.low,
  '--chill': OFFICIAL_DESIGN_TOKENS.palette.moods.chill,
  '--flow': OFFICIAL_DESIGN_TOKENS.palette.moods.flow,
  '--evolve': OFFICIAL_DESIGN_TOKENS.palette.moods.evolve,
  '--hero-size': 'min(480px, 80vw)'
};
