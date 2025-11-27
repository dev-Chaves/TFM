import { relations } from "drizzle-orm";
import { date, jsonb, primaryKey, real, text } from "drizzle-orm/pg-core";
import { pgEnum, timestamp, varchar, bigint } from "drizzle-orm/pg-core"; 
import { integer, pgTable, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(), 
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique(),
    stravaId: bigint("strava_id", { mode: "number" }).unique(), 
    accessToken: varchar("access_token"),
    refreshToken: varchar("refresh_token"),
    expiresAt: integer("expires_at"),

    // Guarda o perfil do atleta para a IA não alucinar
    profileConfig: jsonb("profile_config"),

    createdAt: timestamp("created_at").defaultNow()
});

export const activities = pgTable("activities", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    stravaActivityId: bigint("strava_activity_id", {mode: "number"}).unique(),
    name: varchar("name",{length: 255}),
    type: varchar("type", {length: 55}),
    distance: real("distance"),
    movingTime: integer("moving_time"), // strava usa segundos
    startDate: timestamp("start_date"),

    // JSON puro do strava caso precisa reprocessar
    rawData: jsonb("raw_data")
})

export const workouts = pgTable("workouts", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(()=>users.id),
    scheduleDate: date("scheduled_date").notNull(),
    description: text("description").notNull(),

    structure: jsonb("structure"),

    completedActivityId: integer("completed_activity_id").references(()=> activities.id),

    aiFeedback: text("ai_feedback"),

    createdAt: timestamp("created_at").defaultNow()
});

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  // Uma atividade pode estar ligada a um treino planejado
  matchedWorkout: one(workouts, {
    fields: [activities.id],
    references: [workouts.completedActivityId]
  })
}));

export const workoutsRelations = relations(workouts, ({ one }) => ({
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
  // Um treino planejado pode ter uma atividade realizada vinculada
  activity: one(activities, {
    fields: [workouts.completedActivityId],
    references: [activities.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    activities: many(activities),
    workouts: many(workouts),
}));