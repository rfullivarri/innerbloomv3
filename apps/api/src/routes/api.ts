import express from 'express';
import catalogRouter from './catalog.js';
import meTasksRouter from './me/tasks.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use('/catalog', catalogRouter);
router.use('/me', authMiddleware, meTasksRouter);

export default router;
