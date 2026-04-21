import { z } from "zod";
import aiService from "../ai/aiService";
import userRepository from "../users/userRepository"
import workoutRepository from "../workouts/workoutRepository";
import activityRepository from "./activityRepository";
import { ActivityResponseDTO, toActivityResponseDTO, ActivityEntity } from "./activitiesDTO";
import { StravaActivity, StravaActivitySchema, WorkoutStructure } from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";
import { queueFeedbackGeneration } from "../ai/feedbackQueue";

const log = createLogger("ActivityService");

/**
 * Response type for sync activities operation
 */
export interface SyncActivitiesResponse {
    message: string;
    new_activities_linked: number;
}

/**
 * Tipo interno para atividade salva com rawData
 */
interface SavedActivity {
    id: number;
    startDate: Date | null;
    rawData: StravaActivity | null;
    distance: number | null;
    type: string | null;
}

/**
 * Tipo para workout não completado
 */
interface PendingWorkout {
    id: number;
    userId: number;
    scheduleDate: string;
    structure: WorkoutStructure | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extrai a data local da atividade usando start_date_local do Strava
 * Isso já vem convertido para o timezone do usuário
 */
function getLocalDateFromActivity(activity: SavedActivity): string | null {
    const rawData = activity.rawData;
    
    // Prioriza start_date_local que já vem no timezone correto
    if (rawData?.start_date_local) {
        return rawData.start_date_local.split('T')[0];
    }
    
    // Fallback: usa startDate do banco
    if (activity.startDate) {
        return new Date(activity.startDate).toISOString().split('T')[0];
    }
    
    return null;
}

/**
 * Verifica se o tipo de atividade é compatível com o treino planejado
 */
function isTypeCompatible(activityType: string | null, workoutType: string | null): boolean {
    if (!activityType || !workoutType) return false;
    
    const runTypes = ['Run', 'VirtualRun', 'TrailRun', 'Treadmill'];
    const plannedRunTypes = ['Rodagem', 'Longo', 'Intervalado', 'Tempo Run', 'Regenerativo', 'Fartlek'];
    
    const isActivityRun = runTypes.includes(activityType);
    const isPlannedRun = plannedRunTypes.some(t => workoutType.toLowerCase().includes(t.toLowerCase()));
    
    return isActivityRun && isPlannedRun;
}

/**
 * Calcula score de compatibilidade entre atividade e treino
 * Maior score = melhor match
 */
function calculateMatchScore(activity: SavedActivity, workout: PendingWorkout): number {
    let score = 0;
    const structure = workout.structure;
    
    if (!structure) return 10; // Base score se não há estrutura
    
    // +50 pontos se tipo é compatível (Run -> Rodagem/Longo/etc)
    if (isTypeCompatible(activity.type, structure.tipo)) {
        score += 50;
    }
    
    // +50 pontos proporcional à proximidade de distância
    const targetDist = structure.distancia_km || 0;
    const actualDist = (activity.distance || 0) / 1000;
    
    if (targetDist > 0) {
        const distDiff = Math.abs(targetDist - actualDist);
        const distScore = Math.max(0, 50 - distDiff * 10);
        score += distScore;
    }
    
    return score;
}

/**
 * Encontra o melhor match para uma atividade entre os treinos pendentes
 * Usa score baseado em tipo e distância
 */
function findBestMatch(
    activity: SavedActivity, 
    activityDate: string, 
    pendingWorkouts: PendingWorkout[]
): PendingWorkout | null {
    // Filtra treinos do mesmo dia que ainda não foram vinculados
    const sameDayWorkouts = pendingWorkouts.filter(w => 
        w.scheduleDate === activityDate
    );
    
    if (sameDayWorkouts.length === 0) return null;
    if (sameDayWorkouts.length === 1) return sameDayWorkouts[0];
    
    // Múltiplos treinos no mesmo dia: calcula score e escolhe o melhor
    log.debug({ activityId: activity.id, candidates: sameDayWorkouts.length }, "Múltiplos treinos no dia, calculando best match");
    
    let bestMatch = sameDayWorkouts[0];
    let bestScore = calculateMatchScore(activity, bestMatch);
    
    for (let i = 1; i < sameDayWorkouts.length; i++) {
        const current = sameDayWorkouts[i];
        const currentScore = calculateMatchScore(activity, current);
        
        if (currentScore > bestScore) {
            bestMatch = current;
            bestScore = currentScore;
        }
    }
    
    log.debug({ workoutId: bestMatch.id, score: bestScore }, "Melhor match selecionado");
    
    return bestMatch;
}

// =============================================================================
// ACTIVITY SERVICE
// =============================================================================

const activityService = {

    /**
     * Sincroniza atividades do Strava para o banco de dados
     * e vincula atividades realizadas com treinos planejados
     */
    async syncActivities(userId: number): Promise<SyncActivitiesResponse> {

        log.info({ userId }, "Iniciando sincronização de atividades");

        const user = await userRepository.getUserById(userId);

        if(!user) {
            log.warn({ userId }, "Usuário não encontrado");
            throw new Error("Usuário não encontrado");
        }

        const lastActivity = await activityRepository.getLastActivityByUserId(userId);
        
        let afterParam = "";
        if (lastActivity?.startDate) {
            const timestamp = Math.floor(new Date(lastActivity.startDate).getTime() / 1000);
            afterParam = `&after=${timestamp}`;
            log.debug({ lastActivityDate: lastActivity.startDate }, "Buscando atividades após última sincronização");
        }

        const url = `https://www.strava.com/api/v3/athlete/activities?per_page=30${afterParam}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization" : `Bearer ${user.accessToken}`
            }
        });

        if(!response.ok) {
            log.error({ status: response.status, statusText: response.statusText }, "Erro ao consultar atividades do Strava");
            throw new Error(`Error ao consultar atividades do atleta: ${response.statusText}`);
        }

        const rawData: unknown = await response.json();

        // Valida o array de atividades do Strava
        const activitiesArraySchema = z.array(StravaActivitySchema);
        const parseResult = activitiesArraySchema.safeParse(rawData);
        
        let stravaActivities: StravaActivity[];
        if (parseResult.success) {
            stravaActivities = parseResult.data;
        } else {
            log.warn({ error: parseResult.error.message }, "Strava response não passou validação Zod, usando dados raw");
            stravaActivities = rawData as StravaActivity[];
        }

        log.info({ count: stravaActivities.length }, "Atividades recebidas do Strava");

        const savedActivities = await activityRepository.saveActivities(user.id, stravaActivities);

        log.info({ savedCount: savedActivities.length }, "Atividades salvas no banco");

        // PERFORMANCE: Calcula range de datas das atividades para filtrar treinos
        const activityDates = savedActivities
            .map(a => getLocalDateFromActivity(a as SavedActivity))
            .filter((d): d is string => d !== null)
            .sort();
        
        if (activityDates.length === 0) {
            log.info({ userId }, "Nenhuma atividade com data válida para sincronizar");
            return {
                message: `Sincronização realizada com sucesso`,
                new_activities_linked: 0
            };
        }

        const minDate = activityDates[0];
        const maxDate = activityDates[activityDates.length - 1];

        log.debug({ minDate, maxDate }, "Range de datas para buscar treinos");

        // PERFORMANCE: Busca apenas treinos no range de datas (não todos)
        const workoutsNotCompleted = await workoutRepository.getWorkoutsInDateRange(userId, minDate, maxDate);

        log.debug({ count: workoutsNotCompleted.length }, "Treinos pendentes no range");

        // Mantém track dos workouts já vinculados nesta sync
        const linkedWorkoutIds = new Set<number>();
        let matchesFound = 0;

        for (const activity of savedActivities) {

            // TIMEZONE: Usa data local da atividade
            const activityDate = getLocalDateFromActivity(activity as SavedActivity);

            if(!activityDate) continue;

            // Filtra workouts que ainda não foram vinculados nesta sync
            const availableWorkouts = (workoutsNotCompleted as PendingWorkout[]).filter(
                w => !linkedWorkoutIds.has(w.id)
            );

            // BEST MATCH: Seleciona o melhor treino para esta atividade
            const match = findBestMatch(activity as SavedActivity, activityDate, availableWorkouts);

            if(match) {
                linkedWorkoutIds.add(match.id);

                await workoutRepository.linkActivityToWorkout(match.id, activity.id);
                
                matchesFound++;

                log.info({ workoutId: match.id, activityId: activity.id, date: activityDate }, "Atividade vinculada ao treino planejado");

                // RETRY LOGIC: Usa queue com retry ao invés de fire-and-forget
                const rawActivityData = activity.rawData as StravaActivity | null;
                if (rawActivityData) {
                    queueFeedbackGeneration(
                        match.userId, 
                        match.id,
                        match.structure,
                        rawActivityData
                    );
                }
            }

        }

        log.info({ userId, newActivities: savedActivities.length, matchesFound }, "Sincronização concluída");

        return {
            message: `Sincronização realizada com sucesso`,
            new_activities_linked: matchesFound
        };

    },

    /**
     * Retorna as últimas atividades do usuário formatadas para o frontend
     */
    async getActivities(userId: number, limit = 30, page = 1): Promise<ActivityResponseDTO[]> {
        log.debug({ userId, limit, page }, "Buscando atividades do usuário com paginação");
        const rawActivities = await activityRepository.getLastActivities(userId, limit, page);
        return rawActivities.map((activity) => toActivityResponseDTO(activity as ActivityEntity));
    },

    /**
     * Busca detalhes completos de uma atividade via Strava API
     * Endpoint: GET /activities/{id}
     * Retorna dados enriquecidos incluindo splits_metric, laps, segment_efforts, etc.
     */
    async fetchActivityDetails(userId: number, stravaActivityId: number): Promise<StravaActivity | null> {
        
        log.info({ userId, stravaActivityId }, "Buscando detalhes da atividade no Strava");

        const user = await userRepository.getUserById(userId);
        
        if (!user) {
            log.warn({ userId }, "Usuário não encontrado para buscar detalhes");
            return null;
        }

        const url = `https://www.strava.com/api/v3/activities/${stravaActivityId}`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${user.accessToken}`
                }
            });

            if (!response.ok) {
                log.error({ 
                    status: response.status, 
                    statusText: response.statusText,
                    stravaActivityId 
                }, "Erro ao buscar detalhes da atividade no Strava");
                return null;
            }

            const rawData: unknown = await response.json();
            
            // Valida resposta com Zod (permissive para aceitar campos extras)
            const parseResult = StravaActivitySchema.safeParse(rawData);
            
            let activityDetails: StravaActivity;
            if (parseResult.success) {
                activityDetails = parseResult.data;
            } else {
                log.warn({ 
                    error: parseResult.error.message,
                    stravaActivityId 
                }, "Resposta detalhada não passou validação Zod, usando dados raw");
                activityDetails = rawData as StravaActivity;
            }

            log.info({ 
                stravaActivityId,
                hasSplits: !!activityDetails.splits_metric,
                splitsCount: activityDetails.splits_metric?.length ?? 0
            }, "Detalhes da atividade obtidos com sucesso");

            return activityDetails;

        } catch (error) {
            log.error({ 
                stravaActivityId,
                error: error instanceof Error ? error.message : error 
            }, "Erro ao buscar detalhes da atividade");
            return null;
        }
    },

    /**
     * Enriquece dados de uma atividade buscando detalhes se necessário
     * Verifica se já tem splits_metric, se não, busca e salva no banco
     */
    async enrichActivityData(
        userId: number, 
        activity: StravaActivity, 
        dbActivityId: number
    ): Promise<StravaActivity> {
        
        // Se já tem splits, não precisa buscar novamente
        if (activity.splits_metric && activity.splits_metric.length > 0) {
            log.debug({ stravaActivityId: activity.id }, "Atividade já tem splits, pulando enriquecimento");
            return activity;
        }

        log.info({ stravaActivityId: activity.id }, "Atividade sem splits, buscando detalhes");

        const details = await this.fetchActivityDetails(userId, activity.id);

        if (details) {
            // Salva dados enriquecidos no banco
            await activityRepository.updateActivityRawData(dbActivityId, details);
            
            log.info({ 
                stravaActivityId: activity.id,
                splitsCount: details.splits_metric?.length ?? 0 
            }, "Detalhes salvos com splits_metric");

            return details;
        }

        // Fallback: retorna dados originais
        return activity;
    }

}

export default activityService;