import { type Request, type Response, type NextFunction } from 'express';

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0] ?? 'unknown';
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const cleanupBuckets = (now: number) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

export const createRateLimitMiddleware = (options: RateLimitOptions) => {
  const prefix = options.keyPrefix ?? 'global';

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupBuckets(now);

    const key = `${prefix}:${req.path}:${getClientIp(req)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(options.maxRequests - 1));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + options.windowMs) / 1000)));
      return next();
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
      res.status(429).json({ code: 'rate_limited', message: 'Too many requests' });
      return;
    }

    current.count += 1;

    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.maxRequests - current.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
    next();
  };
};
