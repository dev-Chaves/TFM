import {drizzle} from "drizzle-orm/bun-sql";

const dbUrl: string = process.env.DATABASE_URL!;

const db = drizzle(dbUrl);

export default db;;