export interface MissionsV2SlotStub {
  key: 'main' | 'hunt' | 'skill';
  label: string;
  status: 'empty';
}

export interface MissionsV2BossStub {
  label: string;
  status: 'locked' | 'upcoming';
  description: string;
}

export interface MissionsV2BoardStub {
  slots: MissionsV2SlotStub[];
  boss: MissionsV2BossStub;
}

export const MISSIONS_V2_EMPTY_BOARD_STUB: MissionsV2BoardStub = Object.freeze({
  slots: [
    { key: 'main' as const, label: 'Main', status: 'empty' as const },
    { key: 'hunt' as const, label: 'Hunt', status: 'empty' as const },
    { key: 'skill' as const, label: 'Skill', status: 'empty' as const },
  ],
  boss: {
    label: 'Boss Battle',
    status: 'upcoming' as const,
    description: 'La raid se habilitará cuando definamos la nueva progresión cooperativa.',
  },
});
