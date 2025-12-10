import { calculatePace } from "../ai/aiFormatter";
import { DashboardItem, PlanoSemanalAI, SaveWorkoutDTO } from "./workoutDTO";
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

    },

    async saveAiFeedback(workoutId: number, aiFeedback: any) {  
        return workoutRepository.saveAiFeedback(workoutId, aiFeedback);
    },

    async getDashboardData(userId: number) {
        
        if(userId == null) throw new Error("ID Inválido");
        
        const rawWorkouts = await workoutRepository.getWorkoutsWithActivities(userId);

        return rawWorkouts.map(w => {
            const hoje = new Date().toString().split('T')[0];

            let status: DashboardItem['status'] = 'Pendente';

            if(w.completedActivityId) status = 'Concluido';

            else if(!w.completedActivityId && w.scheduleDate < hoje) status = 'Perdido';

            const structure = w.structure as any; 
            const feedback = w.aiFeedback as any;
            const activity = w.activity; 
            let paceFormatado = "0:00 min/km";
            let distanciaRealizada = "0.00 km";
            let tempoRealizado = "0 min";
            let stravaId = 0;

        
            if (activity && activity.movingTime && activity.movingTime > 0) {

                const dist = activity.distance ?? 0; 

                const time = activity.movingTime;   

                const velocidadeMetersPerSecond = dist / time;
                paceFormatado = `${calculatePace(velocidadeMetersPerSecond)} min/km`;
                
                distanciaRealizada = `${(dist / 1000).toFixed(2)} km`;
                tempoRealizado = `${Math.round(time / 60)} min`;
                stravaId = Number(activity.stravaActivityId);
            }

            return {
                id: w.id,
                data: w.scheduleDate,
                status: status,
                titulo: w.description,
                
                planeado: {
                    distancia: `${structure?.distancia_km || 0} km`,
                    tempo: `${structure?.tempo_min || 0} min`,
                    tipo: structure?.tipo || "Geral"
                },

                
                realizado: activity ? {
                    strava_id: stravaId,
                    distancia: distanciaRealizada,
                    tempo: tempoRealizado,
                    pace: paceFormatado
                } : undefined,

                coach: feedback ? {
                    nota: feedback.score,
                    comentario: feedback.comentario_coach,
                    tags: [...(feedback.pontos_positivos || []), ...(feedback.pontos_atencao || [])]
                } : undefined
            };
        });
    }

};

export default workoutService;