import { Hono } from 'hono';
import auth from './modules/auth/auth';
import activies from './modules/acitivies/activies';
import ai from './modules/ai/ai';
import users from './modules/users/users';

const app = new Hono()

app.get('/', (c) => {

  console.log("Hehehe")

  return c.text('Hello Hono!');
});

app.route("/auth", auth);

app.route("/activies", activies);

app.route("/ai", ai);

app.route("/users", users);

export default {
  port: process.env.PORT,
  fetch: app.fetch,
}
