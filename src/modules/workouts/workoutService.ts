import {differenceInDays} from "date-fns";

import { calculatePace } from "../ai/aiFormatter";
import { DashboardItem, SaveWorkoutDTO, DashboardCoachFeedback } from "./workoutDTO";
import workoutRepository from "./workoutRepository";
import userRepository from "../users/userRepository";
import { 
    DayOfWeek, 
    PlanoSemanalAI, 
    PlanoMensalAI,
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

    async saveWorkout(userId: number, aiPlan: PlanoMensalAI) {
        
        log.info({ userId, semanasCount: aiPlan.semanas?.length || 0 }, "Salvando plano de treino mensal");

        if(!aiPlan.semanas || aiPlan.semanas.length === 0){
            log.warn({ userId }, "Plano de treino mensal inválido: Nenhuma semana encontrada");
            throw new Error("Plano de treino mensal inválido: Nenhuma semana encontrada.");
        };

        const user = await userRepository.getUserById(userId);

        if(user?.currentGoal == null){
            log.warn({ userId }, "Usuário sem meta configurada");
            throw new Error("Por favor, configure sua meta antes de gerar um plano.");
        }

        // Rate limit: 21 dias entre gerações
        if (user?.lastWorkoutGeneratedAt && differenceInDays(new Date(), user.lastWorkoutGeneratedAt) < 21) {
            log.warn({ userId }, "Usuário deve esperar pelo menos 21 dias entre a geração de planos");
            throw new Error("Você deve esperar pelo menos 21 dias entre a geração de planos");
        }

        // Deleta TODOS os treinos pendentes antes de gerar novos
        // Treinos já concluídos (com feedback) são preservados
        const deletedWorkouts = await workoutRepository.deletePendingWorkouts(userId);
        if (deletedWorkouts.length > 0) {
            log.info({ userId, deletedCount: deletedWorkouts.length }, "Treinos pendentes anteriores removidos");
        }

        const availableDays = user?.currentGoal?.availableDays;
        
        if (!availableDays || availableDays.length === 0) {
            log.warn({ userId }, "Usuário sem dias disponíveis configurados");
            throw new Error("Por favor, configure seus dias de treino antes de gerar um plano.");
        }

        const workoutsToSave: SaveWorkoutDTO[] = []; 
        // Sempre começa de hoje, já que deletamos todos os pendentes
        let currentStartDate: Date | null = null;

        for (const semana of aiPlan.semanas) {
            const treinosDaSemana = semana.treinos;
            
            // Calcula as datas para esta semana específica
            const scheduleDates = getNextAvailableDates(availableDays as DayOfWeek[], treinosDaSemana.length, currentStartDate);
            
            // Atualiza currentStartDate para a última data desta semana para a próxima iteração
            currentStartDate = scheduleDates[scheduleDates.length - 1];

            treinosDaSemana.forEach((treino, index) => {
                const structure: WorkoutStructure = {
                    tipo: treino.tipo,
                    titulo: treino.titulo,
                    objetivo_sessao: treino.objetivo_sessao,
                    distancia_km: treino.distancia_total_km,
                    tempo_min: treino.tempo_estimado_min,
                    fases: treino.fases,
                    dicas_execucao: treino.dicas_execucao,
                    sensacao_esperada: treino.sensacao_esperada,
                    contexto_semana: semana.resumo_semana,
                    mensagem_coach: aiPlan.mensagem_coach,
                    foco_semana: semana.foco_semana
                };

                workoutsToSave.push({
                    userId: userId,
                    scheduleDate: scheduleDates[index],
                    description: treino.descricao_completa,
                    structure: structure,
                    completedActivityId: undefined,
                    aiFeedback: undefined
                });
            });
        }

        await workoutRepository.saveMany(workoutsToSave);

        await userRepository.updateUserLastWorkoutGeneratedAt(userId);
    },

    async getWorkoutByUserId(userId: number) {

        if(userId == null) throw new Error("ID Inválido");

        return workoutRepository.getWorkoutByUserId(userId);

    },

    async saveAiFeedback(workoutId: number, aiFeedback: AiFeedbackWrapper) {  
        return workoutRepository.saveAiFeedback(workoutId, aiFeedback);
    },

    async getDashboardData(userId: number, limit = 30, page = 1): Promise<DashboardItem[]> {
        
        if(userId == null) throw new Error("ID Inválido");
        
        const rawWorkouts = await workoutRepository.getWorkoutsWithActivities(userId, limit, page);

        return rawWorkouts.map(w => {

            const hoje = new Date().toISOString().split('T')[0];

            const workoutDate = new Date(w.scheduleDate).toISOString().split("T")[0];

            let status: DashboardItem['status'] = 'Pendente';

            if(w.completedActivityId) status = 'Concluido';

            else if(!w.completedActivityId && workoutDate < hoje) status = 'Perdido';

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