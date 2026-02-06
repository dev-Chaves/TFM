import { Context } from "hono";
import aiService from "./aiService";
import { SemanaAI } from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("AIController");

/**
 * Lock em memória para evitar chamadas simultâneas do mesmo usuário
 */
const generationLocks = new Map<number, boolean>();

/**
 * Response types
 */
interface GenerateWorkoutSuccessResponse {
    message: string;
    resumo: string;
    objetivo?: string;
    semanas: SemanaAI[];
}

interface ErrorResponse {
    error: string;
    code?: string;
}

const aiController = {

    /**
     * Gera um plano de treino semanal usando IA
     * Implementa idempotência com lock em memória
     */
    async generateWorkoutPlan(c: Context): Promise<Response> {

        const userId = Number(c.get("userId"));

        if (Number.isNaN(userId)) {
            return c.json<ErrorResponse>({error: "ID de usuário inválido"}, 400);
        }

        // IDEMPOTÊNCIA: Verificar se já há uma geração em andamento
        if (generationLocks.get(userId)) {
            log.warn({ userId }, "Tentativa de geração duplicada bloqueada");
            return c.json<ErrorResponse>({
                error: "Geração de treino já em andamento. Aguarde.",
                code: "GENERATION_IN_PROGRESS"
            }, 429); // Too Many Requests
        }

        try {
            // Adquirir lock
            generationLocks.set(userId, true);
            log.info({ userId }, "Iniciando geração de plano de treino");

            const response = await aiService.generateWorkoutPlan(userId);

            log.info({ userId }, "Plano de treino retornado com sucesso");
            return c.json<GenerateWorkoutSuccessResponse>(response);

        } catch(err) {
            const errorMessage = err instanceof Error ? err.message : "Erro interno no servidor.";
            log.error({ userId, error: errorMessage }, "Erro ao gerar plano de treino");
            return c.json<ErrorResponse>({
                error: errorMessage
            }, 400);

        } finally {
            // Liberar lock SEMPRE
            generationLocks.delete(userId);
        }

    }

}

export default aiController;