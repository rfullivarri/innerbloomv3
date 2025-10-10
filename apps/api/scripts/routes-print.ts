import 'dotenv/config';
import listEndpoints from 'express-list-endpoints';

process.env.NODE_ENV ||= 'development';
process.env.SKIP_DB_READY = 'true';
process.env.DATABASE_URL ||= 'postgres://postgres:postgres@localhost:5432/placeholder?sslmode=disable';

const { default: app } = await import('../src/app.js');

const endpoints = listEndpoints(app)
  .flatMap(({ methods, path }) => methods.map((method) => ({ method, path })))
  .sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)));

endpoints.forEach(({ method, path }) => {
  console.log(`${method.padEnd(6)} ${path}`);
});
