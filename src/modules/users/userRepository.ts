import db from "../../db/db";
import { StravaAthleteResponse } from "../auth/authDto";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { GoalConfig } from "../../shared/schemas";

/**
 * User entity type (inferred from Drizzle schema)
 */
export type User = typeof users.$inferSelect;

const userRepository = {

    /**
     * Salva ou atualiza um usuário no banco de dados
     */
    async saveUser(
        athlete: StravaAthleteResponse, 
        access_token: string, 
        refresh_token: string, 
        expires_at: number
    ): Promise<User> {

        const expiresAtDate = new Date(expires_at * 1000);

        const [user] = await db.insert(users).values({
            name: `${athlete.firstname} ${athlete.lastname}`,
            stravaId: athlete.id,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: expiresAtDate,

            profileConfig: {
                bio: athlete.bio,
                avatar: athlete.profile,
                city: athlete.city
            }
        }).onConflictDoUpdate({
            target: users.stravaId,
            set: {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: expiresAtDate,
                name: `${athlete.firstname} ${athlete.lastname}`,
                profileConfig: {
                    bio: athlete.bio,
                    avatar: athlete.profile,
                    city: athlete.city
                }
            }
        }).returning();

        return user;
    },

    /**
     * Busca usuário por ID interno
     */
    async getUserById(userId: number): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        return user;
    },

    /**
     * Atualiza o objetivo do usuário
     */
    async updateGoal(userId: number, goalData: GoalConfig): Promise<void> {
        await db.update(users).set({
            currentGoal: goalData
        }).where(eq(users.id, userId));
    },

    /**
     * Busca usuário por Strava ID
     */
    async getUserByStravaId(stravaId: number): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.stravaId, stravaId));
        return user;
    },

    /**
     * Marca o primeiro login do usuário como false
     */
    async updateUserFirstLoginToFalse(userId: number): Promise<void> {
        await db.update(users).set({
            firstLogin: false
        }).where(eq(users.id, userId));
    },

    /**
     * Atualiza a data da última geração de treino (rate limit)
     */
    async updateLastWorkoutGeneratedAt(userId: number): Promise<void> {
        await db.update(users).set({
            lastWorkoutGeneratedAt: new Date()
        }).where(eq(users.id, userId));
    }

}

export default userRepository;