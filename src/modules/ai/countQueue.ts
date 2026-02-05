import { createLogger } from "../../shared/utils/logger";
import userRepository from "../users/userRepository";

const log = createLogger("CountQueue");

/**
 * Response type para verificação de rate limit
 */
interface RateLimitCheck {
    canGenerate: boolean;
    remainingMs: number;
    nextAvailableDate?: Date;
}

/**
 * Verifica se o usuário pode gerar um novo treino
 * Limite: 1 geração por mês (persistido no banco de dados)
 * 
 * @returns { canGenerate: boolean, remainingMs: number, nextAvailableDate?: Date }
 */
export async function canGenerateWorkout(userId: number): Promise<RateLimitCheck> {
    const user = await userRepository.getUserById(userId);

    // Se não tem usuário ou nunca gerou, pode gerar
    if (!user || !user.lastWorkoutGeneratedAt) {
        return { canGenerate: true, remainingMs: 0 };
    }

    const lastGen = new Date(user.lastWorkoutGeneratedAt);
    const now = new Date();

    // Verifica se está no mesmo mês e ano
    const sameMonth = lastGen.getMonth() === now.getMonth();
    const sameYear = lastGen.getFullYear() === now.getFullYear();

    if (sameMonth && sameYear) {
        // Calcula início do próximo mês
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const remainingMs = nextMonth.getTime() - now.getTime();

        log.debug({ 
            userId, 
            lastGen: lastGen.toISOString(),
            nextAvailable: nextMonth.toISOString(),
            remainingMs 
        }, "Rate limit ativo - usuário já gerou treino este mês");

        return { 
            canGenerate: false, 
            remainingMs,
            nextAvailableDate: nextMonth
        };
    }

    // Mês diferente, pode gerar
    return { canGenerate: true, remainingMs: 0 };
}

/**
 * Registra uma tentativa bem-sucedida de geração
 * Persiste no banco de dados para sobreviver a reinícios
 */
export async function recordGenerationAttempt(userId: number): Promise<void> {
    await userRepository.updateLastWorkoutGeneratedAt(userId);
    log.info({ userId }, "Tentativa de geração registrada no banco de dados");
}