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

            const workoutDate = new Date(w.scheduleDate).toISOString().split("T");

            let status: DashboardItem['status'] = 'Pendente';

            if(w.completedActivityId) status = 'Concluido';

            else if(!w.completedActivityId && w.scheduleDate < hoje) status = 'Perdido';

            const structure = w.structure as any; 
            const feedback = w.aiFeedback as any;
            const activity = w.activity; 
            
            let paceRealizado = undefined;
            let distanciaRealizada = undefined;

            if (activity && activity.movingTime && activity.movingTime > 0) {
                const distKm = (activity.distance ?? 0) / 1000;
                const timeMin = activity.movingTime / 60;   
                
                const velocidadeMetersPerSecond = (activity.distance ?? 0) / activity.movingTime;
                paceRealizado = calculatePace(velocidadeMetersPerSecond);
                
                distanciaRealizada = Number(distKm.toFixed(2));
            }

            let pacePlanejado = "0:00";
            if (structure?.distancia_km && structure?.tempo_min) {
                const paceDecimal = structure.tempo_min / structure.distancia_km;
                const min = Math.floor(paceDecimal);
                const sec = Math.round((paceDecimal - min) * 60);
                pacePlanejado = `${min}:${sec.toString().padStart(2, '0')}`;
            }

            return {
                id: w.id,
                data: w.scheduleDate, // O frontend espera string data ISO
                status: status,
                description: w.description,
                
                // Mapeamento direto para as props do ActivityCard
                tipo: structure?.tipo || "Treino",
                distancia_planejada: Number(structure?.distancia_km || 0),
                pace_planejado: pacePlanejado,
                
                distancia_realizada: distanciaRealizada, 
                pace_realizado: paceRealizado,           

                coach: feedback ? {
                    pontuacao: feedback.score || 0,
                    comentario: feedback.comentario_coach || "",
                    aspectos_positivos: feedback.pontos_positivos || [],
                    areas_melhoria: feedback.pontos_atencao || []
                } : undefined
            };
        });
    }

};

export default workoutService;