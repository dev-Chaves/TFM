import {drizzle} from "drizzle-orm/bun-sql";
import * as schema from "./schema"

const dbUrl: string = process.env.DATABASE_URL!;

const db = drizzle(dbUrl, {schema});

export default db;