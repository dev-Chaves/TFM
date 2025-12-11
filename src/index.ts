import { Hono } from 'hono';
import auth from './modules/auth/auth';
import activies from './modules/acitivies/activies';
import ai from './modules/ai/ai';
import users from './modules/users/users';
import workouts from './modules/workouts/workouts';
import webhook from './modules/webhook/webhook';

const app = new Hono()

app.get('/', (c) => {

  console.log("Hehehe")

  return c.text('Hello Hono!');
});

app.route("/auth", auth);

app.route("/activies", activies);

app.route("/ai", ai);

app.route("/users", users);

app.route("/workouts", workouts);

app.route("/webhook", webhook);

export default {
  port: process.env.PORT,
  fetch: app.fetch,
}
