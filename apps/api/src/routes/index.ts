import { Router } from 'express';
import healthRoutes from './health.js';
import leaderboardRoutes from './leaderboard.js';
import legacyRoutes from './legacy.js';
import meRoutes from './me.js';
import pillarsRoutes from './pillars.js';
import tasksRoutes from './tasks.js';
import usersRoutes from './users.js';
import dailyQuestRoutes from './dailyQuest.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import onboardingRoutes from './onboarding.js';

const router = Router();

router.use(healthRoutes);
router.use(pillarsRoutes);
router.use(legacyRoutes);
router.use(meRoutes);
router.use(tasksRoutes);
router.use(dailyQuestRoutes);
router.use(usersRoutes);
router.use(leaderboardRoutes);
router.use(adminRoutes);
router.use(onboardingRoutes);

export default router;
