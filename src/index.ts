import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import auth from './modules/auth/auth';
import activities from './modules/activities/activities';
import ai from './modules/ai/ai';
import users from './modules/users/users';
import workouts from './modules/workouts/workouts';
import webhook from './modules/webhook/webhook';
import logger, { createLogger } from './shared/utils/logger';

const log = createLogger("Server");

const app = new Hono();

// Global Error Handler
app.onError((err, c) => {
  log.error({ 
    err: err instanceof Error ? err.message : err,
    stack: err instanceof Error ? err.stack : undefined,
    path: c.req.path,
    method: c.req.method
  }, "Unhandled Error");

  if (err instanceof ZodError) {
    return c.json({
      error: "Erro de validação de dados.",
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    }, 400);
  }

  const status = (err as any).status || 500;
  return c.json({
    error: err instanceof Error ? err.message : "Erro interno no servidor."
  }, status);
});

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  log.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`
  }, "Request completed");
});

app.use("/*", cors({
  origin: ["https://gotfm.site", "https://www.gotfm.site"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true
}));

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.route("/auth", auth);

app.route("/activities", activities);

app.route("/ai", ai);

app.route("/users", users);

app.route("/workouts", workouts);

app.route("/webhook", webhook);

// Startup log
log.info({ port: process.env.PORT }, "🚀 Server starting");

export default {
  port: process.env.PORT,
  fetch: app.fetch,
  idleTimeout: 120, // 120 seconds
}
