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
    { key: 'main', label: 'Main', status: 'empty' },
    { key: 'hunt', label: 'Hunt', status: 'empty' },
    { key: 'skill', label: 'Skill', status: 'empty' },
  ],
  boss: {
    label: 'Boss Battle',
    status: 'upcoming',
    description: 'La raid se habilitará cuando definamos la nueva progresión cooperativa.',
  },
});
