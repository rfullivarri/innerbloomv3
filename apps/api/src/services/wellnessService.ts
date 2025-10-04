import { prisma } from '../lib/db.js';

export async function getTodaySummary() {
  const now = new Date();
  return {
    date: now.toISOString().split('T')[0],
    missions: [
      { id: 'mission-1', title: 'Complete a mindful walk', completed: false },
      { id: 'mission-2', title: 'Check in with a friend', completed: true }
    ],
    rewards: [
      { id: 'reward-1', title: 'Daily streak bonus', points: 10 }
    ]
  };
}

export interface CheckInPayload {
  mood: string;
  notes?: string;
}

export async function createCheckIn(payload: CheckInPayload) {
  // Placeholder persistence until business logic is defined.
  await prisma.checkIn.create({
    data: {
      mood: payload.mood ? { connectOrCreate: {
        where: { label: payload.mood },
        create: { label: payload.mood }
      }} : undefined,
      notes: payload.notes,
      user: {
        connectOrCreate: {
          where: { email: 'demo@innerbloom.local' },
          create: { email: 'demo@innerbloom.local' }
        }
      }
    }
  });

  return { success: true };
}
