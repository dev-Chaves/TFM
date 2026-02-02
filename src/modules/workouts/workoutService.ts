import { calculatePace } from "../ai/aiFormatter";
import { DashboardItem, SaveWorkoutDTO, DashboardCoachFeedback } from "./workoutDTO";
import workoutRepository from "./workoutRepository";
import userRepository from "../users/userRepository";
import { 
    DayOfWeek, 
    PlanoSemanalAI, 
    WorkoutStructure, 
    AiFeedbackWrapper,
    FasesTreino 
} from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("WorkoutService");

// Função auxiliar para encontrar as próximas datas disponíveis
// Se startAfterDate for passado, começa a buscar a partir do dia seguinte a essa data
function getNextAvailableDates(availableDays: DayOfWeek[], count: number, startAfterDate?: Date | null): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate: Date;
    
    if (startAfterDate) {
        // Começa no dia seguinte à última data de treino
        currentDate = new Date(startAfterDate);
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(currentDate.getDate() + 1);
    } else {
        // Sem treinos anteriores: começa a partir de hoje
        currentDate = new Date(today);
    }
    
    while (dates.length < count) {
        const dayOfWeek = currentDate.getDay() as DayOfWeek;
        
        if (availableDays.includes(dayOfWeek)) {
            dates.push(new Date(currentDate));
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Segurança: máximo 60 dias no futuro
        if (dates.length === 0 && currentDate.getTime() - today.getTime() > 60 * 24 * 60 * 60 * 1000) {
            throw new Error("Não foi possível encontrar dias disponíveis nos próximos 60 dias");
        }
    }
    
    return dates;
}

const workoutService = {

    async saveWorkout(userId: number, aiPlan: PlanoSemanalAI) {
        
        log.info({ userId, treinosCount: aiPlan.treinos?.length || 0 }, "Salvando plano de treino");

        if(!aiPlan.treinos || aiPlan.treinos.length === 0){
            log.warn({ userId }, "Plano de treino inválido: Nenhum treino encontrado");
            throw new Error("Plano de treino inválido: Nenhum treino encontrado.");
        };

        // Busca a última data de treino agendado para adicionar os novos após essa data
        const lastScheduledDate = await workoutRepository.getLastScheduledDate(userId);
        
        log.debug({ userId, lastScheduledDate }, "Última data de treino agendado");

        const user = await userRepository.getUserById(userId);
        const availableDays = user?.currentGoal?.availableDays;
        const weeklyFrequency = user?.currentGoal?.weeklyFrequency || aiPlan.treinos.length;
        
        const treinosParaSalvar = aiPlan.treinos.slice(0, weeklyFrequency);
                
        let scheduleDates: Date[];
        
        if (availableDays && availableDays.length > 0) {
            // Usa os dias disponíveis do usuário, começando após o último treino agendado
            scheduleDates = getNextAvailableDates(availableDays as DayOfWeek[], treinosParaSalvar.length, lastScheduledDate);
        } else {
            // Fallback: dias consecutivos começando após o último treino
            const startDate = lastScheduledDate ? new Date(lastScheduledDate) : new Date();
            if (lastScheduledDate) {
                startDate.setDate(startDate.getDate() + 1); // Dia seguinte ao último treino
            }
            startDate.setHours(0, 0, 0, 0);
            
            scheduleDates = treinosParaSalvar.map((_, index) => {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + index);
                return date;
            });
        }

        const workoutsToSave: SaveWorkoutDTO[] = treinosParaSalvar.map((treino, index) => {
            const structure: WorkoutStructure = {
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
            };

            return {
                userId: userId,
                scheduleDate: scheduleDates[index],
                description: treino.descricao_completa,
                structure: structure,
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

    async saveAiFeedback(workoutId: number, aiFeedback: AiFeedbackWrapper) {  
        return workoutRepository.saveAiFeedback(workoutId, aiFeedback);
    },

    async getDashboardData(userId: number): Promise<DashboardItem[]> {
        
        if(userId == null) throw new Error("ID Inválido");
        
        const rawWorkouts = await workoutRepository.getWorkoutsWithActivities(userId);

        return rawWorkouts.map(w => {

            const hoje = new Date().toString().split('T')[0];

            const workoutDate = new Date(w.scheduleDate).toISOString().split("T");

            let status: DashboardItem['status'] = 'Pendente';

            if(w.completedActivityId) status = 'Concluido';

            else if(!w.completedActivityId && w.scheduleDate < hoje) status = 'Perdido';

            const structure = w.structure as WorkoutStructure | null; 
            const feedback = w.aiFeedback as AiFeedbackWrapper | null;
            const activity = w.activity; 
            
            let paceRealizado: string | undefined = undefined;
            let distanciaRealizada: number | undefined = undefined;

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

            // Build coach feedback object if available
            let coach: DashboardCoachFeedback | undefined = undefined;
            if (feedback?.feedbackText) {
                coach = {
                    score: feedback.feedbackText.score || 0,
                    status: feedback.feedbackText.status || "",
                    emoji: feedback.feedbackText.emoji || "🎯",
                    titulo_feedback: feedback.feedbackText.titulo_feedback || "",
                    comentario: feedback.feedbackText.comentario_coach || "",
                    analise_splits: feedback.feedbackText.analise_splits || "",
                    aspectos_positivos: feedback.feedbackText.pontos_positivos || [],
                    areas_melhoria: feedback.feedbackText.pontos_atencao || [],
                    dica_proxima: feedback.feedbackText.dica_proxima || ""
                };
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
                fases: (structure?.fases as FasesTreino) || null,
                
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
                coach: coach
            };
        });
    }

};

export default workoutService;