import { Router } from 'express';
import healthRoutes from './health.js';
import playerRoutes from './player.js';

const router = Router();

router.use(healthRoutes);
router.use(playerRoutes);

export default router;
