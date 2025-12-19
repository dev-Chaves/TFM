import { calculatePace } from "../ai/aiFormatter";
import { DashboardItem, PlanoSemanalAI, SaveWorkoutDTO } from "./workoutDTO";
import workoutRepository from "./workoutRepository";
import userRepository from "../users/userRepository";
import { DayOfWeek } from "../ai/aiDTO";

// Função auxiliar para encontrar as próximas datas disponíveis
function getNextAvailableDates(availableDays: DayOfWeek[], count: number): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Começa amanhã
    
    while (dates.length < count) {
        const dayOfWeek = currentDate.getDay() as DayOfWeek;
        
        if (availableDays.includes(dayOfWeek)) {
            dates.push(new Date(currentDate));
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Segurança: máximo 30 dias no futuro
        if (dates.length === 0 && currentDate.getTime() - today.getTime() > 30 * 24 * 60 * 60 * 1000) {
            throw new Error("Não foi possível encontrar dias disponíveis nos próximos 30 dias");
        }
    }
    
    return dates;
}

const workoutService = {

    async saveWorkout(userId: number, aiPlan: PlanoSemanalAI) {
        
        if(!aiPlan.treinos || aiPlan.treinos.length === 0){
            throw new Error("Plano de treino inválido: Nenhum treino encontrado.");
        };

        // LIMPAR TREINOS PENDENTES ANTIGOS - evita duplicação
        await workoutRepository.deletePendingWorkouts(userId);

        // Buscar dias disponíveis e weeklyFrequency do usuário
        const user = await userRepository.getUserById(userId);
        const availableDays = user?.currentGoal?.availableDays;
        const weeklyFrequency = user?.currentGoal?.weeklyFrequency || aiPlan.treinos.length;
        
        // VALIDAÇÃO: Limitar quantidade de treinos ao weeklyFrequency
        const treinosParaSalvar = aiPlan.treinos.slice(0, weeklyFrequency);
        
        console.log(`[saveWorkout] userId: ${userId}, weeklyFrequency: ${weeklyFrequency}, salvando: ${treinosParaSalvar.length} treinos`);
        
        let scheduleDates: Date[];
        
        if (availableDays && availableDays.length > 0) {
            // Usa os dias disponíveis do usuário
            scheduleDates = getNextAvailableDates(availableDays, treinosParaSalvar.length);
            console.log(`[saveWorkout] Datas calculadas: ${scheduleDates.map(d => d.toISOString().split('T')[0]).join(', ')}`);
        } else {
            // Fallback: dias consecutivos começando amanhã
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            
            scheduleDates = treinosParaSalvar.map((_, index) => {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + index);
                return date;
            });
            console.log(`[saveWorkout] Fallback - Datas consecutivas: ${scheduleDates.map(d => d.toISOString().split('T')[0]).join(', ')}`);
        }

        const workoutsToSave: SaveWorkoutDTO[] = treinosParaSalvar.map((treino, index) => {
            return {
                userId: userId,
                scheduleDate: scheduleDates[index],
                description: treino.descricao_completa,
                structure: {
                    tipo: treino.tipo,
                    titulo: treino.titulo,
                    objetivo_sessao: treino.objetivo_sessao,
                    distancia_km: treino.distancia_total_km,
                    tempo_min: treino.tempo_estimado_min,
                    fases: treino.fases,
                    dicas_execucao: treino.dicas_execucao,
                    sensacao_esperada: treino.sensacao_esperada,
                    contexto_semana: aiPlan.resumo_semana,
                    mensagem_coach: aiPlan.mensagem_coach,
                    foco_semana: aiPlan.foco_semana
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
                data: w.scheduleDate,
                status: status,
                description: w.description,
                
                // Campos básicos
                tipo: structure?.tipo || "Treino",
                titulo: structure?.titulo || structure?.tipo || "Treino",
                objetivo_sessao: structure?.objetivo_sessao || "",
                distancia_planejada: Number(structure?.distancia_km || 0),
                tempo_estimado_min: Number(structure?.tempo_min || 0),
                pace_planejado: pacePlanejado,
                
                // Nova estrutura detalhada de fases
                fases: structure?.fases || null,
                
                // Dicas e sensação esperada
                dicas_execucao: structure?.dicas_execucao || [],
                sensacao_esperada: structure?.sensacao_esperada || "",
                
                // Contexto do plano
                contexto_semana: structure?.contexto_semana || "",
                mensagem_coach: structure?.mensagem_coach || "",
                foco_semana: structure?.foco_semana || [],
                
                // Dados realizados (quando completado)
                distancia_realizada: distanciaRealizada, 
                pace_realizado: paceRealizado,           

                // Feedback do coach
                coach: feedback?.feedbackText ? {
                    score: feedback.feedbackText.score || 0,
                    status: feedback.feedbackText.status || "",
                    emoji: feedback.feedbackText.emoji || "🎯",
                    titulo_feedback: feedback.feedbackText.titulo_feedback || "",
                    comentario: feedback.feedbackText.comentario_coach || "",
                    analise_splits: feedback.feedbackText.analise_splits || "",
                    aspectos_positivos: feedback.feedbackText.pontos_positivos || [],
                    areas_melhoria: feedback.feedbackText.pontos_atencao || [],
                    dica_proxima: feedback.feedbackText.dica_proxima || ""
                } : undefined
            };
        });
    }

};

export default workoutService;