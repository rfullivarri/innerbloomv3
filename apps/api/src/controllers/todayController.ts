import { Request, Response } from 'express';
import { getTodaySummary } from '../services/wellnessService';

export async function getToday(req: Request, res: Response) {
  const summary = await getTodaySummary();
  res.json(summary);
}
