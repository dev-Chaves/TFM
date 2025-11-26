import { Hono } from 'hono';
import auth from './routes/auth';

const app = new Hono()

app.get('/', (c) => {

  console.log("Hehehe")

  return c.text('Hello Hono!');
});

app.route("/auth", auth);

export default {
  port: process.env.PORT,
  fetch: app.fetch,
}
