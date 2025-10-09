import process from 'node:process';
import { Router } from 'express';

export default function createDebugAuthRouter() {
  const router = Router();

  router.get('/_debug/auth-header', (req, res) => {
    if (process.env.DEBUG_AUTH !== 'true') {
      return res.status(404).json({
        code: 'not_found',
        message: 'Debug auth route disabled',
      });
    }

    const authorization = req.get('authorization');

    return res.json({
      hasAuth: Boolean(authorization),
      authorizationSample: authorization?.slice(0, 20) ?? null,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });
  });

  return router;
}
