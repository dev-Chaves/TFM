import { createLogger } from "../../shared/utils/logger";

const log = createLogger("CountQueue");

/**
 * Interface para controle de tentativas de geração
 */
interface GenerationAttempt {
    userId: number;
    lastAttempt: Date;
}

/**
 * Queue em memória para controle de frequência
 * Nota: Como é em memória, será resetada ao reiniciar o servidor.
 * TODO: Futuramente mover para o banco de dados (tabela users ou nova tabela).
 */
const generationHistory = new Map<number, GenerationAttempt>();

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Verifica se o usuário pode gerar um novo treino
 * @returns { canGenerate: boolean, remainingMs: number }
 */
export function canGenerateWorkout(userId: number): { canGenerate: boolean; remainingMs: number } {
    const attempt = generationHistory.get(userId);

    if (!attempt) {
        return { canGenerate: true, remainingMs: 0 };
    }

    const now = new Date().getTime();
    const lastAttemptTime = attempt.lastAttempt.getTime();
    const elapsed = now - lastAttemptTime;

    if (elapsed >= COOLDOWN_MS) {
        return { canGenerate: true, remainingMs: 0 };
    }

    return { 
        canGenerate: false, 
        remainingMs: COOLDOWN_MS - elapsed 
    };
}

/**
 * Registra uma tentativa bem-sucedida de geração
 */
export function recordGenerationAttempt(userId: number): void {
    generationHistory.set(userId, {
        userId,
        lastAttempt: new Date()
    });
    
    log.info({ userId }, "Tentativa de geração registrada");
}