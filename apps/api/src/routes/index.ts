import { Router } from 'express';
import healthRoutes from './health.js';
import leaderboardRoutes from './leaderboard.js';
import legacyRoutes from './legacy.js';
import meRoutes from './me.js';
import pillarsRoutes from './pillars.js';
import tasksRoutes from './tasks.js';
import usersRoutes from './users.js';
import dailyQuestRoutes from './dailyQuest.js';
import catalogRoutes from './catalog.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import onboardingRoutes from './onboarding.js';
import missionsRoutes from './missions.js';
import internalRoutes from './internal.js';

const router = Router();

router.use(healthRoutes);
router.use(pillarsRoutes);
router.use(legacyRoutes);
router.use(catalogRoutes);
router.use(meRoutes);
router.use(tasksRoutes);
router.use(dailyQuestRoutes);
router.use(missionsRoutes);
router.use(usersRoutes);
router.use(leaderboardRoutes);
router.use(adminRoutes);
router.use(onboardingRoutes);
router.use(internalRoutes);

export default router;
