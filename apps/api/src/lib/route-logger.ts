import type { Application } from 'express';
import type { FastifyInstance } from 'fastify';

const isProduction = process.env.NODE_ENV === 'production';

type RouteLoggerOptions = {
  expressApp: Application;
  fastify: FastifyInstance;
};

export async function logRegisteredRoutes({ expressApp, fastify }: RouteLoggerOptions): Promise<void> {
  if (isProduction) {
    return;
  }

  const { default: listEndpoints } = await import('express-list-endpoints');

  const endpoints = listEndpoints(expressApp).flatMap(({ path, methods }) =>
    methods.map((method) => ({ method, path })),
  );

  endpoints
    .sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)))
    .forEach(({ method, path }) => {
      fastify.log.info({ method, path }, 'Express route registered');
    });

  await fastify.ready();

  const routeTree = fastify.printRoutes({ includeHooks: false });
  fastify.log.info({ routeTree }, 'Fastify routes registered');
}
