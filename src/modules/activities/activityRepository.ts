import db from "../../db/db";
import {activities} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

const activityRepository = { 

    async saveActivities (userId: number, stravaActivities: any[]) {

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

    async getLastActivities(userId: number, limit = 15) {
        return await db.query.activities.findMany({
            where: eq(activities.userId, userId),
            orderBy: (activities, {desc}) => [desc(activities.startDate)],
            limit: limit
        })
    },

    async getLastActivityByUserId(userId: number) {
        const result = await db.query.activities.findFirst({
            where: eq(activities.userId, userId),
            orderBy: (activities, {desc}) => [desc(activities.startDate)]
        });
        return result;
    }

}

export default activityRepository;