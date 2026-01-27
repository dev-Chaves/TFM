import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './modules/auth/auth';
import activities from './modules/activities/activities';
import ai from './modules/ai/ai';
import users from './modules/users/users';
import workouts from './modules/workouts/workouts';
import webhook from './modules/webhook/webhook';

const app = new Hono();

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

export default {
  port: process.env.PORT,
  fetch: app.fetch,
}
