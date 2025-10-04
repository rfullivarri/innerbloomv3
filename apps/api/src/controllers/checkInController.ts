import { Request, Response } from 'express';
import { z } from 'zod';
import { createCheckIn, type CheckInPayload } from '../services/wellnessService.js';

const checkInSchema: z.ZodType<CheckInPayload> = z.object({
  mood: z.string().min(1),
  notes: z.string().optional()
});

export async function createCheckInHandler(req: Request, res: Response) {
  const parseResult = checkInSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.issues });
  }

  const result = await createCheckIn(parseResult.data);
  res.status(201).json(result);
}
