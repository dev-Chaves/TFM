import db from "../../db/db";
import {activities} from "../../db/schema";
import { eq, sql } from "drizzle-orm";
import { StravaActivity } from "../../shared/schemas";

const activityRepository = { 

    async saveActivities (userId: number, stravaActivities: StravaActivity[]) {

        if (stravaActivities.length === 0) return[];

        const valuesToInsert = stravaActivities.map(activity => ({
            userId: userId,
            stravaActivityId: activity.id,
            name: activity.name,
            type: activity.type,
            distance: activity.distance,
            movingTime: activity.moving_time,
            startDate: new Date(activity.start_date),
            rawData: activity
        }));       

        const savedActivities =  await db.insert(activities)
            .values(valuesToInsert)
            .onConflictDoUpdate({
                target: activities.stravaActivityId,
                set: {
                    name: sql`excluded.name`,
                    distance: sql`excluded.distance`,
                    movingTime: sql`excluded.moving_time`,
                    startDate: sql`excluded.start_date`,
                    rawData: sql`excluded.raw_data`
                }
            }).returning();

            return savedActivities;

    },

    async getLastActivities(userId: number, limit = 30, page = 1) {
        const offset = (page - 1) * limit;
        return await db.query.activities.findMany({
            where: eq(activities.userId, userId),
            orderBy: (activities, {desc}) => [desc(activities.startDate)],
            limit: limit,
            offset: offset
        })
    },

    async getLastActivityByUserId(userId: number) {
        const result = await db.query.activities.findFirst({
            where: eq(activities.userId, userId),
            orderBy: (activities, {desc}) => [desc(activities.startDate)]
        });
        return result;
    },

    /**
     * Atualiza rawData de uma atividade com dados detalhados do Strava
     */
    async updateActivityRawData(activityId: number, rawData: StravaActivity) {
        await db.update(activities)
            .set({ rawData })
            .where(eq(activities.id, activityId));
    },

    /**
     * Busca uma atividade pelo stravaActivityId
     */
    async getActivityByStravaId(userId: number, stravaActivityId: number) {
        return await db.query.activities.findFirst({
            where: (activities, { eq, and }) => and(
                eq(activities.userId, userId),
                eq(activities.stravaActivityId, stravaActivityId)
            )
        });
    },

    /**
     * Busca uma atividade pelo ID do banco de dados
     */
    async getActivityById(id: number) {
        return await db.query.activities.findFirst({
            where: eq(activities.id, id)
        });
    },

    /**
     * Verifica se o usuário tem pelo menos uma atividade do tipo Run
     */
    async hasUserRunActivity(userId: number): Promise<boolean> {
        const result = await db.query.activities.findFirst({
            where: (activities, { eq, and }) => and(
                eq(activities.userId, userId),
                eq(activities.type, "Run")
            )
        });
        return !!result;
    }

}

export default activityRepository;