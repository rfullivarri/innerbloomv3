import { Router } from 'express';
import { getToday } from '../controllers/todayController.js';
import { createCheckInHandler } from '../controllers/checkInController.js';

const router = Router();

router.get('/today', getToday);
router.post('/check-in', createCheckInHandler);

export default router;
