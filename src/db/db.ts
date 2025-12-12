import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString: connectionString,
  ssl: true 
});

const db = drizzle(pool, { schema });

export default db;