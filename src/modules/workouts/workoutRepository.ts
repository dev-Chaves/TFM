import { eq } from "drizzle-orm";
import db from "../../db/db";
import { workouts } from "../../db/schema";
import { SaveWorkoutDTO } from "./workoutDTO";


const workoutRepository = {

    async saveWorkout(userId: number, workoutData: SaveWorkoutDTO) {

        const result = await db.insert(workouts).values({
            userId: userId,
            scheduleDate: new Date(workoutData.scheduleDate).toString(),
            description: workoutData.description,
            structure: workoutData.structure || null,
            completedActivityId: workoutData.completedActivityId || null,
            aiFeedback: workoutData.aiFeedback || null
        }).returning();

        return result ;

    },

    async saveMany(data: SaveWorkoutDTO[]) {
        
        if (data.length === 0) return;

        // Formatação final para o Drizzle/Postgres
        // O campo 'date' do Postgres espera string YYYY-MM-DD
        const valuesToInsert = data.map(item => ({
            userId: item.userId,
            scheduleDate: item.scheduleDate.toISOString().split('T')[0], 
            description: item.description,
            structure: item.structure,
            completedActivityId: item.completedActivityId,
            aiFeedback: item.aiFeedback
        }));

        const result = await db.insert(workouts)
            .values(valuesToInsert)
            .returning();

        return result;
    },

    async getWorkoutByUserId(userId: number){

        return db.select().from(workouts).where(eq(workouts.userId, userId));

    }

};  

export default workoutRepository;