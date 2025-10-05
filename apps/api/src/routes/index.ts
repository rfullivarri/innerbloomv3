import { Router } from 'express';
import healthRoutes from './health.js';
import leaderboardRoutes from './leaderboard.js';
import legacyRoutes from './legacy.js';
import pillarsRoutes from './pillars.js';
import tasksRoutes from './tasks.js';
import usersRoutes from './users.js';

const router = Router();

router.use(healthRoutes);
router.use(pillarsRoutes);
router.use(legacyRoutes);
router.use(tasksRoutes);
router.use(usersRoutes);
router.use(leaderboardRoutes);

export default router;
