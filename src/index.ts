import { Hono } from 'hono';
import auth from './modules/auth/auth';
import activies from './modules/acitivies/activies';
import ai from './modules/ai/ai';
import users from './modules/users/users';
import workouts from './modules/workouts/workouts';

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

export default {
  port: process.env.PORT,
  fetch: app.fetch,
}
