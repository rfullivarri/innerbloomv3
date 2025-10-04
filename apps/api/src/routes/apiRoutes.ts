import { Router } from 'express';
import { getToday } from '../controllers/todayController';
import { createCheckInHandler } from '../controllers/checkInController';

const router = Router();

router.get('/today', getToday);
router.post('/check-in', createCheckInHandler);

export default router;
