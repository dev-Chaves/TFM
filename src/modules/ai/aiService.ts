import { generateCompletion } from "./aiProvider";
import userRepository from "../users/userRepository";
import activityRepository from "../activities/activityRepository";
import { calculatePace, formatActivyForAI } from "./aiFormatter";
import workoutService from "../workouts/workoutService";
import { 
    StravaActivity, 
    StravaSplitMetric, 
    WorkoutStructure,
    PlanoSemanalAI,
    PlanoMensalAI,
    SemanaAI,
    TreinoAI 
} from "../../shared/schemas";
import { createLogger } from "../../shared/utils/logger";

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

        const user = await userRepository.getUserById(userId);

        if(!user) {
            log.warn({ userId }, "Usuário não encontrado");
            throw new Error("Usuário não encontrado");
        }

        const recentActivities = await activityRepository.getLastActivities(userId, 15);

        const historyContext = recentActivities.map(a => formatActivyForAI(a.rawData as StravaActivity)).map(a => 
            `- Data: ${a.data}, Tipo: ${a.tipo}, Dist: ${a.distancia_km}, Tempo: ${a.tempo_movimento}, Pace: ${a.pace_medio}, FC: ${a.frequencia_cardiaca}`
        ).join("\n");

        const goal = user.currentGoal || {
            targetDistanceKm: 5,
            weeklyFrequency: 3,
            experienceLevel: "beginner",
            text: "Melhorar saúde"
        }

        const systemPrompt = `
Você é o COACH VIRTUAL, um treinador de corrida de rua de elite com 20 anos de experiência.

🏃 FILOSOFIA DE TREINO:
- Periodização inteligente: alternância de estímulos para evolução constante.
- Plano de QUATRO SEMANAS:
    - Semana 1: Base/Adaptação
    - Semana 2: Carga/Intensidade
    - Semana 3: Pico/Volume
    - Semana 4: Recuperação/Polimento (Tapering)
- Regra dos 10%: nunca aumentar volume semanal mais que 10%
- 80/20: 80% em baixa intensidade, 20% em alta intensidade
- Recuperação é parte do treino: dias leves são tão importantes quanto os fortes

📋 TIPOS DE TREINO (use apenas estes):
1. RODAGEM: Corrida contínua em ritmo confortável (conversa possível)
2. LONGO: Treino de resistência, maior volume da semana
3. INTERVALADO: Tiros curtos/médios com recuperação (desenvolve velocidade)
4. TEMPO RUN: Corrida no limiar anaeróbico (ritmo "desconfortavelmente confortável")
5. REGENERATIVO: Recuperação ativa, ritmo muito leve
6. FARTLEK: Variações de ritmo livres durante a corrida

⚠️ REGRAS OBRIGATÓRIAS:
- Sistema métrico (km, min/km)
- Paces REALISTAS baseados no histórico do atleta
- Cada treino DEVE ter: aquecimento, parte principal e desaquecimento
- Intervalados SEMPRE especificam: repetições, distância, pace, tipo de descanso
- Tom motivador e pessoal (use "você", seja encorajador)
- Responda EXCLUSIVAMENTE em formato JSON válido
`;

        const userPrompt = `
🎯 MISSÃO: Crie um plano de treino MENSAL (4 semanas) personalizado para este atleta.

════════════════════════════════════════
📊 PERFIL DO ATLETA
════════════════════════════════════════
Nome: ${user.name || "Atleta"}
Peso: ${user.weight ? user.weight + "kg" : "Não informado"}
Nível: ${goal.experienceLevel === "beginner" ? "Iniciante" : goal.experienceLevel === "intermediate" ? "Intermediário" : "Avançado"}

════════════════════════════════════════
🎯 OBJETIVO ATUAL
════════════════════════════════════════
Meta: ${goal.text || `Correr ${goal.targetDistanceKm}km`}
Distância Alvo: ${goal.targetDistanceKm}km
Data da Prova: ${goal.targetDate || "Não definida (treino contínuo)"}
Treinos por Semana: ${goal.weeklyFrequency}
Dias Disponíveis: ${goal.availableDays ? goal.availableDays.map((d: number) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ') : "Qualquer dia"}

════════════════════════════════════════
📈 HISTÓRICO RECENTE (Últimos treinos)
════════════════════════════════════════
${historyContext || "Sem histórico disponível - atleta novo, seja conservador nos paces"}

════════════════════════════════════════
📝 INSTRUÇÕES DE GERAÇÃO
════════════════════════════════════════
1. Analise o pace médio recente para definir paces realistas.
2. Gere exatamente 4 SEMANAS de treinos.
3. Cada semana deve ter exatamente ${goal.weeklyFrequency} treinos.
4. Aplique periodização: adapte o volume e intensidade progressivamente em 3 semanas, com a 4ª sendo de recuperação.
5. Para INTERVALADOS, detalhe cada série com precisão.

════════════════════════════════════════
📤 FORMATO DE SAÍDA (JSON EXATO)
════════════════════════════════════════
{
    "objetivo_mensal": "Meta de longo prazo (mês)",
    "mensagem_coach": "Mensagem motivadora geral para o mês",
    "semanas": [
        {
            "numero_semana": 1,
            "resumo_semana": "Foco da semana 1",
            "foco_semana": ["Base", "Adaptação"],
            "treinos": [
                {
                    "dia": 1,
                    "tipo": "Rodagem",
                    "titulo": "✨ Início Leve",
                    "objetivo_sessao": "Adaptação inicial",
                    "distancia_total_km": 5,
                    "tempo_estimado_min": 35,
                    "fases": { ... mesma estrutura de fases ... },
                    "dicas_execucao": [...],
                    "sensacao_esperada": "...",
                    "descricao_completa": "..."
                }
            ]
        }
    ]
}

IMPORTANTE: Gere exatamente ${goal.weeklyFrequency} treinos. Use paces realistas baseados no histórico!
`;


        const aiContent = await generateCompletion({
            messages: [
                {role: "system", content: systemPrompt},
                {role: "user", content: userPrompt}
            ],
            jsonMode: true
        });

        const plan: PlanoMensalAI = JSON.parse(aiContent);

        log.info({ userId, semanasCount: plan.semanas.length }, "Plano de treino mensal gerado com sucesso");

        await workoutService.saveWorkout(userId, plan);

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

        const systemPrompt = `
Você é o COACH VIRTUAL, um treinador de corrida experiente e motivador.

🎯 SUA MISSÃO:
Analisar a execução do treino do atleta comparando o PLANEJADO vs REALIZADO.
Seja honesto, mas sempre encorajador. O objetivo é ajudar o atleta a evoluir.

📊 CRITÉRIOS DE AVALIAÇÃO:
- Score 9-10: Execução excelente, superou ou cumpriu perfeitamente
- Score 7-8: Bom treino, pequenos ajustes necessários
- Score 5-6: Treino parcial, precisa de atenção
- Score 3-4: Treino abaixo do esperado, revisar estratégia
- Score 0-2: Não cumpriu o objetivo

🎭 TOM DE VOZ:
- Use "você" para falar diretamente com o atleta
- Seja motivador mesmo ao apontar melhorias
- Celebre pequenas vitórias
- Dê sugestões práticas e acionáveis

⚠️ REGRAS:
- Responda EXCLUSIVAMENTE em formato JSON válido
- Analise a consistência dos splits (variação de pace)
- Considere se era um treino de ritmo constante ou intervalado

📤 FORMATO DO JSON:
{
    "score": 8,
    "status": "Cumpriu",
    "emoji": "🎯",
    "titulo_feedback": "Treino sólido!",
    "comentario_coach": "Mensagem direta e motivadora (2-3 frases, use o contexto do treino)",
    "analise_splits": "Análise da consistência do ritmo km a km",
    "pontos_positivos": ["Ponto específico 1", "Ponto específico 2"],
    "pontos_atencao": ["Sugestão de melhoria 1"],
    "dica_proxima": "Uma dica prática para o próximo treino similar"
}
`;

        const userPrompt = `
════════════════════════════════════════
📋 TREINO PLANEJADO
════════════════════════════════════════
Tipo: ${planned?.tipo || "Corrida"}
Objetivo: ${planned?.objetivo_sessao || "Treino padrão"}
Distância Alvo: ${planned?.distancia_km || "N/A"}km
Descrição: ${planned?.titulo || "N/A"}

${planned?.fases?.principal ? `
Estrutura Principal: ${planned.fases.principal.tipo_estrutura || "contínuo"}
${planned.fases.principal.series ? `Séries: ${JSON.stringify(planned.fases.principal.series)}` : ""}
` : ""}

════════════════════════════════════════
✅ TREINO REALIZADO
════════════════════════════════════════
Distância Total: ${(actual.distance / 1000).toFixed(2)} km
Pace Médio: ${calculatePace(actual.average_speed)} min/km
Tempo Total: ${Math.round(actual.moving_time / 60)} minutos
${actual.average_heartrate ? `FC Média: ${Math.round(actual.average_heartrate)} bpm` : ""}

════════════════════════════════════════
📊 PARCIAIS (SPLITS KM A KM)
════════════════════════════════════════
${splitsTexto}

Analise se o atleta manteve consistência no ritmo e se cumpriu o objetivo do treino.
`;

        
        try {
            const content = await generateCompletion({
                messages: [
                    {role: "system", content: systemPrompt},
                    {role: "user", content: userPrompt}
                ],
                jsonMode: true
            });

            const aiFeedback = JSON.parse(content);

            await workoutService.saveAiFeedback(workoutId, { feedbackText: aiFeedback });
            
            

            log.info({ workoutId }, "Feedback de treino gerado e salvo com sucesso");

        } catch (error) {
            log.error({ workoutId, error: error instanceof Error ? error.message : error }, "Erro ao analisar treino");
        }
    },

};

export default aiService;