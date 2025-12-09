import { PlanoSemanalAI, SaveWorkoutDTO } from "./workoutDTO";
import workoutRepository from "./workoutRepository";

const workoutService = {

    async saveWorkout(userId: number, aiPlan: PlanoSemanalAI) {
        
        if(!aiPlan.treinos || aiPlan.treinos.length === 0){
            throw new Error("Plano de treino inválido: Nenhum treino encontrado.");
        };

        const startDate = new Date();

        const workoutsToSave: SaveWorkoutDTO[] = aiPlan.treinos.map((treino) => {
            
            const workoutDate = new Date(startDate);
            workoutDate.setDate(startDate.getDate() + (treino.dia - 1));

            return {
                userId: userId,
                scheduleDate: workoutDate,
                description: treino.descricao_completa,
                structure: {
                    tipo: treino.tipo,
                    distancia_km: treino.distancia_estimada_km,
                    tempo_min: treino.tempo_estimado_min,
                    contexto_semana: aiPlan.resumo_semana
                },
                completedActivityId: undefined,
                aiFeedback: undefined
            };
        });

        return await workoutRepository.saveMany(workoutsToSave);
    },

    async getWorkoutByUserId(userId: number) {

        if(userId == null) throw new Error("ID Inválido");

        return workoutRepository.getWorkoutByUserId(userId);

    }
};

export default workoutService;