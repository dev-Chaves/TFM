import { and, desc, eq, isNull, gte, lte, max } from "drizzle-orm";
import db from "../../db/db";
import { workouts } from "../../db/schema";
import { SaveWorkoutDTO } from "./workoutDTO";
import { AiFeedbackWrapper } from "../../shared/schemas";


const workoutRepository = {

    // Busca a última data de treino agendado do usuário
    async getLastScheduledDate(userId: number): Promise<Date | null> {
        const result = await db.select({ maxDate: max(workouts.scheduleDate) })
            .from(workouts)
            .where(eq(workouts.userId, userId));
        
        if (result[0]?.maxDate) {
            return new Date(result[0].maxDate);
        }
        return null;
    },

    // Deleta treinos pendentes (não concluídos) a partir de hoje
    async deletePendingWorkouts(userId: number) {
        const today = new Date().toISOString().split('T')[0];
        
        const deleted = await db.delete(workouts)
            .where(and(
                eq(workouts.userId, userId),
                isNull(workouts.completedActivityId), // Não foi feito
                gte(workouts.scheduleDate, today)     // Data >= hoje
            ))
            .returning();
        
        
        return deleted;
    },

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

    },

    async getWorkoutNotCompletedByUserId(userId: number) {
        
        return db.select().from(workouts).where(and(
            eq(workouts.userId, userId),
            isNull(workouts.completedActivityId)
        ));

    },

    async linkActivityToWorkout(workoutId: number, activityId: number) {

        return db.update(workouts).set({
            completedActivityId: activityId
        }).where(eq(workouts.id, workoutId));
    },

    async getWorkoutById(workoutId: number) {
        return db.select().from(workouts).where(eq(workouts.id, workoutId)).limit(1).then(res => res[0]);
    },

    async saveAiFeedback(workoutId: number, aiFeedback: AiFeedbackWrapper) {
        return db.update(workouts).set({
            aiFeedback: aiFeedback
        }).where(eq(workouts.id, workoutId));
    },

    async getWorkoutsWithActivities(userId: number) {

        return db.query.workouts.findMany({
            where: eq(workouts.userId, userId),
            orderBy: [desc(workouts.scheduleDate)],
            with: {
                activity: true
            },
            limit: 30
        });

    },

    /**
     * Busca treinos não completados dentro de um range de datas
     * PERFORMANCE: Evita buscar todos os treinos do usuário
     */
    async getWorkoutsInDateRange(userId: number, startDate: string, endDate: string) {
        return db.select().from(workouts).where(and(
            eq(workouts.userId, userId),
            isNull(workouts.completedActivityId),
            gte(workouts.scheduleDate, startDate),
            lte(workouts.scheduleDate, endDate)
        ));
    }

};  

export default workoutRepository;