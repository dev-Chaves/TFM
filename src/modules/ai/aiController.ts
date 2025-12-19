import { Context } from "hono";
import aiService from "./aiService";

// Lock em memória para evitar chamadas simultâneas do mesmo usuário
const generationLocks = new Map<number, boolean>();

const aiController = {

    async generateWorkoutPlan(c: Context) {

        const userId = Number(c.get("userId"));

        // IDEMPOTÊNCIA: Verificar se já há uma geração em andamento
        if (generationLocks.get(userId)) {
            console.log(`[generateWorkoutPlan] Bloqueado - geração já em andamento para userId: ${userId}`);
            return c.json({
                error: "Geração de treino já em andamento. Aguarde.",
                code: "GENERATION_IN_PROGRESS"
            }, 429); // Too Many Requests
        }

        try {
            // Adquirir lock
            generationLocks.set(userId, true);
            console.log(`[generateWorkoutPlan] Lock adquirido para userId: ${userId}`);

            const response = await aiService.generateWorkoutPlan(userId);

            return c.json(response);

        } catch(err) {
            console.error(err);
            return c.json({
                error: "Erro interno no servidor."
            }, 500);

        } finally {
            // Liberar lock SEMPRE
            generationLocks.delete(userId);
            console.log(`[generateWorkoutPlan] Lock liberado para userId: ${userId}`);
        }

    }

}

export default aiController;