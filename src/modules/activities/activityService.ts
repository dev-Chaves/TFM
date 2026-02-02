import { z } from "zod";
import aiService from "../ai/aiService";
import userRepository from "../users/userRepository"
import workoutRepository from "../workouts/workoutRepository";
import activityRepository from "./activityRepository";
import { ActivityResponseDTO, toActivityResponseDTO, ActivityEntity } from "./activitiesDTO";
import { StravaActivity, StravaActivitySchema, WorkoutStructure } from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("ActivityService");

/**
 * Response type for sync activities operation
 */
export interface SyncActivitiesResponse {
    message: string;
    new_activities_linked: number;
}

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

        const workoutsNotCompleted = await workoutRepository.getWorkoutByUserId(userId);

        let matchesFound = 0;

        for (const activity of savedActivities) {

            const activityDate = activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : null;

            if(!activityDate) continue;

            const match = workoutsNotCompleted.find(w => w.scheduleDate === activityDate);

            if(match) {

                await workoutRepository.linkActivityToWorkout(match.id, activity.id);
                
                matchesFound++;

                log.info({ workoutId: match.id, activityId: activity.id, date: activityDate }, "Atividade vinculada ao treino planejado");

                // Fire-and-forget Pattern: não espera o resultado dessa chamada para continuar
                const rawActivityData = activity.rawData as StravaActivity | null;
                if (rawActivityData) {
                    aiService.generateWorkoutFeedback(
                        match.userId, 
                        match.id,
                        match.structure as WorkoutStructure | null,
                        rawActivityData
                    ).catch((err: Error) => {
                        log.error({ workoutId: match.id, error: err.message }, "Erro ao gerar feedback da IA");
                    });
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
    async getActivities(userId: number): Promise<ActivityResponseDTO[]> {
        log.debug({ userId }, "Buscando atividades do usuário");
        const rawActivities = await activityRepository.getLastActivities(userId);
        return rawActivities.map((activity) => toActivityResponseDTO(activity as ActivityEntity));
    }

}

export default activityService;