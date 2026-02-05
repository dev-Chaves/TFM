import { Context } from "hono";
import { ActivityResponseDTO } from "./activitiesDTO";
import activityService, { SyncActivitiesResponse } from "./activityService";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("ActivityController");

/**
 * Response types
 */
interface ErrorResponse {
    error?: string;
    erro?: string; // para manter compatibilidade
}

const activityController = {

    /**
     * Retorna as últimas atividades do usuário
     */
    async getActivities(c: Context): Promise<Response> {
        const id = Number(c.get("userId"));

        c.header("Cache-Control", "private, max-age=300");
        
        if(Number.isNaN(id)) {
            return c.json<ErrorResponse>({erro: `ID Inválido`}, 400);
        }

        try {
            const activities: ActivityResponseDTO[] = await activityService.getActivities(id);
            return c.json(activities);
        } catch (err) {
            log.error({ userId: id, error: err instanceof Error ? err.message : err }, "Erro ao buscar atividades");
            return c.json<ErrorResponse>({ error: "Erro ao buscar atividades." }, 500);
        }
    },

    /**
     * Sincroniza atividades do Strava para o banco de dados
     */
    async syncActivities(c: Context): Promise<Response> {

        const id = Number(c.get("userId"));

        if(Number.isNaN(id)) {
            return c.json<ErrorResponse>({erro: `ID Inválido`}, 400);
        }

        const error = c.req.query("error");

        if(error) {
            log.warn({ userId: id, error }, "Erro no parâmetro de query");
            return c.json<ErrorResponse>({error: "Erro ao acessar atividades do atleta"}, 400);
        }

        try {
            log.info({ userId: id }, "Sincronizando atividades");
            const response: SyncActivitiesResponse = await activityService.syncActivities(id);
            return c.json(response);

        } catch (err) {
            log.error({ userId: id, error: err instanceof Error ? err.message : err }, "Erro ao sincronizar atividades");
            return c.json<ErrorResponse>({
                error: "Erro interno no servidor."
            }, 500);
        }

    }

}

export default activityController;