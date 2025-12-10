import db from "../../db/db";
import {activities} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

const activityRepository = { 

    async saveActivies (userId: number, stravaActivies: any[]) {

        if (stravaActivies.length === 0) return[];

        const valuesToInsert = stravaActivies.map(activity => ({
            userId: userId,
            stravaActivityId: activity.id,
            name: activity.name,
            type: activity.type,
            distance: activity.distance,
            movingTime: activity.moving_time,
            startDate: new Date(activity.start_date),
            rawData: activity
        }));       

        const saveActivies =  await db.insert(activities)
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

            return saveActivies;

    },

    async getLastActivities(userId: number, limit = 15) {
        return await db.query.activities.findMany({
            where: eq(activities.userId, userId),
            orderBy: (activities, {desc}) => [desc(activities.startDate)],
            limit: limit
        })
    }

}

export default activityRepository;