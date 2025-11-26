import { relations } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/pg-core";
import { pgEnum, timestamp, varchar, bigint } from "drizzle-orm/pg-core"; 
import { integer, pgTable, serial } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["COACH", "ATHLETE"]);

export const users = pgTable("users", {
    id: serial("id").primaryKey(), 
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique(),
    role: role("role"),
    stravaId: bigint("strava_id", { mode: "number" }).unique(), 
    accessToken: varchar("access_token"),
    refreshToken: varchar("refresh_token"),
    expiresAt: integer("expires_at"),
    createdAt: timestamp("created_at").defaultNow()
});

export const coachAthletes = pgTable("coach_athletes", {
    coachId: integer("coach_id").notNull().references(() => users.id),
    athleteId: integer("athlete_id").notNull().references(() => users.id),
}, (t) => [
    primaryKey({ columns: [t.coachId, t.athleteId] })
]);

export const athletesCoachsRelations = relations(coachAthletes, ({ one }) => ({
    // Relação 1: Aponta para o Coach
    coach: one(users, {
        fields: [coachAthletes.coachId], 
        references: [users.id],
        relationName: "coach_relation",  
    }),
    // Relação 2: Aponta para o Atleta
    athlete: one(users, {
        fields: [coachAthletes.athleteId], 
        references: [users.id],
        relationName: "athlete_relation" 
    }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    // Se eu sou user, "coaching" busca onde eu sou o coachId
    coaching: many(coachAthletes, { relationName: "coach_relation" }),

    // Se eu sou user, "trainedBy" busca onde eu sou o athleteId
    trainedBy: many(coachAthletes, { relationName: "athlete_relation" }),
}));