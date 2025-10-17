import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import {
  exportAdminUserLogsCsv,
  getAdminMe,
  getAdminUserInsights,
  getAdminUserLogs,
  getAdminUserTaskStats,
  getAdminUserTasks,
  getAdminUsers,
  patchAdminUserTask,
  getTaskgenTraceForUser,
  getTaskgenTraceByCorrelation,
  getTaskgenTraceGlobal,
  postTaskgenForceRun,
} from './admin.handlers.js';
import { requireAdmin } from './admin.middleware.js';

const router = Router();
const adminRouter = Router();

adminRouter.get('/me', getAdminMe);
adminRouter.get('/users', getAdminUsers);
adminRouter.get('/users/:userId/insights', getAdminUserInsights);
adminRouter.get('/users/:userId/logs', getAdminUserLogs);
adminRouter.get('/users/:userId/tasks', getAdminUserTasks);
adminRouter.get('/users/:userId/task-stats', getAdminUserTaskStats);
adminRouter.patch('/users/:userId/tasks/:taskId', patchAdminUserTask);
adminRouter.get('/users/:userId/logs.csv', exportAdminUserLogsCsv);
adminRouter.get('/taskgen/trace', getTaskgenTraceForUser);
adminRouter.get('/taskgen/trace/by-correlation/:id', getTaskgenTraceByCorrelation);
adminRouter.get('/taskgen/trace/global', getTaskgenTraceGlobal);
adminRouter.post('/taskgen/force-run', postTaskgenForceRun);

router.use('/admin', authMiddleware, requireAdmin, adminRouter);

export default router;
