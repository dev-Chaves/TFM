import { Hono } from 'hono';
import auth from './modules/auth/auth';
import activies from './modules/acitivies/activies';

const app = new Hono()

app.get('/', (c) => {

  console.log("Hehehe")

  return c.text('Hello Hono!');
});

app.route("/auth", auth);

app.route("/activies", activies);

export default {
  port: process.env.PORT,
  fetch: app.fetch,
}
