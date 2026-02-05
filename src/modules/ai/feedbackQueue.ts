import aiService from "./aiService";
import activityService from "../activities/activityService";
import activityRepository from "../activities/activityRepository";
import { StravaActivity, WorkoutStructure } from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("FeedbackQueue");

/**
 * Interface para feedback pendente
 */
interface PendingFeedback {
    userId: number;
    workoutId: number;
    planned: WorkoutStructure | null;
    actual: StravaActivity;
    attempts: number;
    lastAttempt: Date;
}

/**
 * Queue em memória para feedbacks pendentes
 */
const pendingQueue = new Map<number, PendingFeedback>();

/**
 * Configurações de retry
 */
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [30000, 60000, 120000]; // 30s, 1min, 2min

/**
 * Adiciona geração de feedback à queue com retry automático
 * Enriquece atividade com dados detalhados (splits) antes de gerar feedback
 * Em caso de falha, tenta novamente até MAX_RETRIES vezes
 */
export async function queueFeedbackGeneration(
    userId: number,
    workoutId: number,
    planned: WorkoutStructure | null,
    actual: StravaActivity
): Promise<void> {
    
    const pending = pendingQueue.get(workoutId) || {
        userId,
        workoutId,
        planned,
        actual,
        attempts: 0,
        lastAttempt: new Date()
    };

    try {
        log.info({ workoutId, attempt: pending.attempts + 1 }, "Gerando feedback de treino");
        
        // LAZY FETCH: Busca dados detalhados se não tiver splits
        let enrichedActivity = actual;
        const dbActivity = await activityRepository.getActivityByStravaId(userId, actual.id);
        
        if (dbActivity) {
            enrichedActivity = await activityService.enrichActivityData(
                userId, 
                actual, 
                dbActivity.id
            );
        }
        
        await aiService.generateWorkoutFeedback(userId, workoutId, planned, enrichedActivity);
        
        // Sucesso: remove da queue
        pendingQueue.delete(workoutId);
        log.info({ workoutId }, "Feedback gerado com sucesso");
        
    } catch (error) {
        pending.attempts++;
        pending.lastAttempt = new Date();
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (pending.attempts < MAX_RETRIES) {
            // Agenda retry
            pendingQueue.set(workoutId, pending);
            const delay = RETRY_DELAYS_MS[pending.attempts - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
            
            log.warn({ 
                workoutId, 
                attempt: pending.attempts, 
                nextRetryMs: delay,
                error: errorMessage 
            }, "Feedback falhou, agendando retry");
            
            setTimeout(() => {
                queueFeedbackGeneration(userId, workoutId, planned, actual);
            }, delay);
            
        } else {
            // Máximo de tentativas atingido
            pendingQueue.delete(workoutId);
            log.error({ 
                workoutId, 
                totalAttempts: pending.attempts,
                error: errorMessage 
            }, "Feedback falhou após máximo de tentativas");
            
            // TODO: Futuramente pode-se adicionar flag no banco para retry manual
        }
    }
}

/**
 * Retorna quantidade de feedbacks pendentes na queue
 */
export function getPendingCount(): number {
    return pendingQueue.size;
}

/**
 * Retorna lista de workouts com feedback pendente
 */
export function getPendingWorkoutIds(): number[] {
    return Array.from(pendingQueue.keys());
}
