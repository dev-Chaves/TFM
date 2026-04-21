import { Context } from "hono";
import { z } from "zod";
import workoutService from "./workoutService";
import { DashboardItem } from "./workoutDTO";
import { PlanoMensalAISchema, PlanoMensalAI } from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("WorkoutController");

/**
 * Schema para validar o payload de criação de workout
 */
const SaveWorkoutRequestSchema = PlanoMensalAISchema;

/**
 * Response types
 */
interface SaveWorkoutSuccessResponse {
    message: string;
}

interface ErrorResponse {
    error: string;
}

const workoutController = {

    /**
     * Salva um plano de treino para o usuário
     */
    async saveWorkout(c: Context): Promise<Response> {

        const userId = Number(c.get("userId"));

        if(Number.isNaN(userId)) {
            return c.json<ErrorResponse>({error: `ID Inválido`}, 400);
        }

        const rawData: unknown = await c.req.json();
        
        // Valida o payload com Zod
        const parseResult = SaveWorkoutRequestSchema.safeParse(rawData);
        
        if (!parseResult.success) {
            log.warn({ userId, errors: parseResult.error.message }, "Payload inválido");
            return c.json<ErrorResponse>({error: "Payload inválido"}, 400);
        }

        const workoutData: PlanoMensalAI = parseResult.data;
        
        try {    
            await workoutService.saveWorkout(userId, workoutData);
        
            return c.json<SaveWorkoutSuccessResponse>({message: "Treino salvo com sucesso."}); 

        } catch (error) {
            log.error({ userId, error: error instanceof Error ? error.message : error }, "Erro ao salvar treino");
            return c.json<ErrorResponse>({error: "Erro ao salvar treino."}, 500);
        }

    },

    /**
     * Retorna os dados do dashboard para o usuário
     */
    async getWorkoutByUserId(c: Context): Promise<Response> {

        const userId = Number(c.get("userId"));
        const limit = Number(c.req.query("limit")) || 30;
        const page = Number(c.req.query("page")) || 1;

        if(Number.isNaN(userId)) {
            return c.json<ErrorResponse>({erro: `ID Inválido`} as unknown as ErrorResponse, 400);
        }

        try {
            const response: DashboardItem[] = await workoutService.getDashboardData(userId, limit, page);

            if(response.length === 0){
                c.header("Cache-Control", "no-store");
                return c.json(response);
            }

            c.header("Cache-Control", "private, max-age=60");

            return c.json(response);
        } catch (error) {
            log.error({ userId, error: error instanceof Error ? error.message : error }, "Erro ao buscar dados do dashboard");
            return c.json<ErrorResponse>({error: "Erro ao buscar dados."}, 500);
        }

    }

};

export default workoutController;