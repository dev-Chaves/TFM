To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

Environment variables for Docker / Postgres
----------------------------------------

Create a `.env` at the project root (already included) with the following values used by docker-compose:

```
DATABASE_URL=admin
DATABASE_PASSWORD=admin
DATABASE_DB=tfm_db
PORT=3005
CLIENT_ID=111111
CLIENT_SECRET=JSDHAJKSHDJKASHDJKASHDJKASHJKB@#JKHUJKSAHDJKASHJLK
API_KEY=HDASJKHDJAKSHDJKASHDJKASHDJKASHDJKASHDJKASHDJKASHJKDHAJK

```

These values configure the Postgres service (user: admin, password: admin, database: tfm_db).
