import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import {
  exportAdminUserLogsCsv,
  getAdminMe,
  getAdminUserInsights,
  getAdminUserLogs,
  getAdminUserTasks,
  getAdminUsers,
  patchAdminUserTask,
} from './admin.handlers.js';
import { requireAdmin } from './admin.middleware.js';

const router = Router();
const adminRouter = Router();

adminRouter.get('/me', getAdminMe);
adminRouter.get('/users', getAdminUsers);
adminRouter.get('/users/:userId/insights', getAdminUserInsights);
adminRouter.get('/users/:userId/logs', getAdminUserLogs);
adminRouter.get('/users/:userId/tasks', getAdminUserTasks);
adminRouter.patch('/users/:userId/tasks/:taskId', patchAdminUserTask);
adminRouter.get('/users/:userId/logs.csv', exportAdminUserLogsCsv);

router.use('/admin', authMiddleware, requireAdmin, adminRouter);

export default router;
