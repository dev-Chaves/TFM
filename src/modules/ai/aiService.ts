import { generateCompletion } from "./aiProvider";
import userRepository from "../users/userRepository";
import activityRepository from "../activities/activityRepository";
import { calculateBaseline, calculatePace, formatActivyForAI, parsePace, formatPaceFromDecimal } from "./aiFormatter";
import workoutService from "../workouts/workoutService";
import { 
    getWorkoutGenerationSystemPrompt,
    getWorkoutGenerationUserPrompt,
    getWorkoutFeedbackSystemPrompt,
    getWorkoutFeedbackUserPrompt
} from "./prompts";
import { 
    StravaActivity, 
    StravaSplitMetric, 
    WorkoutStructure,
    PlanoSemanalAI,
    PlanoMensalAI,
    SemanaAI,
    TreinoAI,
    PlanoMensalAISchema,
    AiFeedbackContentSchema
} from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";
import { canGenerateWorkout, recordGenerationAttempt } from "./countQueue";
import { differenceInDays } from "date-fns";

const log = createLogger("AIService");

export interface GenerateWorkoutPlanResponse {
    message: string;
    resumo: string;
    objetivo?: string;
    semanas: SemanaAI[];
}



const aiService = {

    /**
     * Gera um plano de treino semanal personalizado usando IA
     */
    async generateWorkoutPlan(userId: number): Promise<GenerateWorkoutPlanResponse> {

        log.info({ userId }, "Iniciando geração de plano de treino");

        // RATE LIMIT: Verifica se o usuário pode gerar treino (1 a cada 24h)
        const check = canGenerateWorkout(userId);
        if (!check.canGenerate) {
            const hours = Math.ceil(check.remainingMs / (60 * 60 * 1000));
            log.warn({ userId, remainingMs: check.remainingMs }, "Limite de geração atingido");
            throw new Error(`Você já gerou um treino recentemente. Tente novamente em aproximadamente ${hours} horas.`);
        }

        const user = await userRepository.getUserById(userId);

        if(!user) {
            log.warn({ userId }, "Usuário não encontrado");
            throw new Error("Usuário não encontrado");
        }

        if(user?.currentGoal == null) {
            log.warn({ userId }, "Usuário não possui metas");
            throw new Error("Usuário não possui metas, cadastre uma meta para gerar um plano de treino.");
        }

        // Rate limit: 21 dias entre gerações
        if (user?.lastWorkoutGeneratedAt && differenceInDays(new Date(), user.lastWorkoutGeneratedAt) < 21) {
            log.warn({ userId }, "Usuário deve esperar pelo menos 21 dias entre a geração de planos");
            throw new Error("Você deve esperar pelo menos 21 dias entre a geração de planos");
        }

        const recentActivities = await activityRepository.getLastActivities(userId, 15);

        const historyContext = recentActivities
            .filter(a => a.rawData !== null)
            .map(a => formatActivyForAI(a.rawData as StravaActivity))
            .map(a => `- Data: ${a.data}, Tipo: ${a.tipo}, Dist: ${a.distancia_km}, Tempo: ${a.tempo_movimento}, Pace: ${a.pace_medio}, FC: ${a.frequencia_cardiaca}`)
            .join("\n");

        if(user.currentGoal == null || user.currentGoal == undefined) {
            log.warn({ userId }, "Usuário não possui metas");
            throw new Error("Usuário não possui metas, cadastre uma meta para gerar um plano de treino.");
        }

        const goal = user.currentGoal;

        const baselineStats = calculateBaseline(
            recentActivities
                .filter(a => a.rawData !== null)
                .map(a => a.rawData as StravaActivity)
        );

        const systemPrompt = getWorkoutGenerationSystemPrompt();
        const userPrompt = getWorkoutGenerationUserPrompt(
            { name: user.name, weight: user.weight },
            goal,
            historyContext,
            baselineStats
        );


        const aiContent = await generateCompletion({
            messages: [
                {role: "system", content: systemPrompt},
                {role: "user", content: userPrompt}
            ],
            jsonMode: true
        });

        // Validação rigorosa da resposta da IA
        let plan: PlanoMensalAI;
        try {
            const rawPlan = JSON.parse(aiContent);
            plan = PlanoMensalAISchema.parse(rawPlan);
        } catch (error) {
            log.error({ userId, error, aiContent }, "Falha ao validar plano gerado pela IA");
            throw new Error("Ocorreu um erro ao gerar um plano válido. Por favor, tente novamente.");
        }

        log.info({ userId, semanasCount: plan.semanas.length }, "Plano de treino mensal gerado e validado com sucesso");

        await workoutService.saveWorkout(userId, plan);

        // RATE LIMIT: Registra a tentativa após sucesso
        recordGenerationAttempt(userId);

        return {
            message: "Plano de treino mensal gerado com sucesso.",
            resumo: plan.objetivo_mensal,
            objetivo: plan.objetivo_mensal,
            semanas: plan.semanas
        }

    },

    /**
     * Gera feedback de treino comparando o planejado com o realizado
     * Fire-and-forget: não retorna nada, apenas salva o feedback no banco
     */
    async generateWorkoutFeedback(
        userId: number,
        workoutId: number,
        planned: WorkoutStructure | null,
        actual: StravaActivity
    ): Promise<void> {

        const user = await userRepository.getUserById(userId);

        if(!user) throw new Error("Usuário não encontrado");

        // 1. Formatar Splits
        let splitsTexto = "Não disponível";
        if (actual.splits_metric && Array.isArray(actual.splits_metric)) {
            splitsTexto = actual.splits_metric
                .map((split: StravaSplitMetric, index: number) => {
                    const pace = calculatePace(split.average_speed);
                    return `Km ${index + 1}: ${pace}`;
                })
                .join(" | ");
        }

        // 2. Calcular pace alvo da fase principal
        let targetPace = "N/A";
        if (planned?.fases?.principal) {
            const principal = planned.fases.principal;
            if (principal.segmentos && principal.segmentos.length > 0) {
                const paces = principal.segmentos
                    .map(s => parsePace(s.pace_alvo))
                    .filter(p => p > 0);
                if (paces.length > 0) {
                    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
                    targetPace = formatPaceFromDecimal(avg);
                }
            } else if (principal.series && principal.series.length > 0) {
                targetPace = principal.series[0].pace_alvo;
            } else if (principal.pace_alvo) {
                targetPace = principal.pace_alvo;
            }
        }

        // 3. Calcular diferença de pace
        const actualPaceMin = parsePace(calculatePace(actual.average_speed));
        const targetPaceMin = parsePace(targetPace);
        let paceDiff = "N/A";
        if (targetPaceMin > 0) {
            const diff = actualPaceMin - targetPaceMin;
            if (diff < 0) {
                paceDiff = `${Math.abs(diff).toFixed(1)} min/km MAIS RÁPIDO (superou)`;
            } else if (diff > 0) {
                paceDiff = `${diff.toFixed(1)} min/km MAIS LENTO (abaixo)`;
            } else {
                paceDiff = "Exatamente no alvo";
            }
        }

        const systemPrompt = getWorkoutFeedbackSystemPrompt();
        const userPrompt = getWorkoutFeedbackUserPrompt(
            planned,
            actual,
            splitsTexto,
            calculatePace(actual.average_speed),
            targetPace,
            paceDiff
        );


        try {
            const content = await generateCompletion({
                messages: [
                    {role: "system", content: systemPrompt},
                    {role: "user", content: userPrompt}
                ],
                jsonMode: true
            });

            const rawFeedback = JSON.parse(content);
            const aiFeedback = AiFeedbackContentSchema.parse(rawFeedback);

            // Enriquecer feedback com dados comparativos calculados
            const enrichedFeedback = {
                ...aiFeedback,
                pace_alvo_principal: targetPace,
                pace_realizado: calculatePace(actual.average_speed),
                pace_diferenca: paceDiff,
                distancia_alvo: planned?.distancia_km || 0,
                distancia_realizada: Number((actual.distance / 1000).toFixed(2)),
            };

            await workoutService.saveAiFeedback(workoutId, { feedbackText: enrichedFeedback });

            log.info({ workoutId }, "Feedback de treino gerado, validado e salvo com sucesso");

        } catch (error) {
            log.error({ workoutId, error: error instanceof Error ? error.message : error }, "Erro ao analisar treino");
        }
    },

};

export default aiService;