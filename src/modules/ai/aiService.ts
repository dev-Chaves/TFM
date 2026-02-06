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

        const historyContext = recentActivities.map(a => formatActivyForAI(a.rawData as StravaActivity)).map(a => 
            `- Data: ${a.data}, Tipo: ${a.tipo}, Dist: ${a.distancia_km}, Tempo: ${a.tempo_movimento}, Pace: ${a.pace_medio}, FC: ${a.frequencia_cardiaca}`
        ).join("\n");

        if(user.currentGoal == null || user.currentGoal == undefined) {
            log.warn({ userId }, "Usuário não possui metas");
            throw new Error("Usuário não possui metas, cadastre uma meta para gerar um plano de treino.");
        }

        const goal = user.currentGoal;

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
- Paces REALISTAS mas DESAFIADORES (sobrecarga progressiva) baseados no histórico.
- PRECISÃO DE PACE: Para CADA km ou bloco (segmento), você DEVE preencher \`pace_alvo\` e \`zona_fc\`.
- OBRIGATÓRIO: Use o campo \`segmentos\` na fase principal para listar a estratégia km a km (ou por blocos lógicos).
- ZONAS DE FC: Indique OBRIGATORIAMENTE a zona de frequência cardíaca (Z1-Z5) para cada segmento ou série.
- Cada treino DEVE ter: aquecimento, parte principal e desaquecimento devidamente separados.

🏃 REGRAS PARA INTERVALADOS (OBRIGATÓRIO):
- Use o campo \`series\` na fase principal para treinos intervalados.
- Cada série DEVE conter:
  - \`repeticoes\`: Número de repetições (ex: 6)
  - \`distancia_m\`: Distância em metros (ex: 800)
  - \`pace_alvo\`: Pace objetivo do tiro (ex: "4:30")
  - \`zona_fc\`: Zona de FC durante o tiro (ex: "Z4")
  - \`descanso_tipo\`: Tipo de recuperação entre tiros - use EXATAMENTE um destes: "parado", "trote" ou "caminhada"
  - \`descanso_duracao\`: Tempo ou distância de descanso (ex: "90s", "200m", "2min")
- Descreva no \`como_executar\` instruções claras sobre o descanso.

- Tom motivador e pessoal (use "você", seja encorajador).
- Responda EXCLUSIVAMENTE em formato JSON válido.
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
1. Analise o pace médio recente para definir paces que "forcem" uma evolução (ex: 5-10s mais rápido que o conforto).
2. Gere exatamente 4 SEMANAS de treinos.
3. Cada semana deve ter exatamente ${goal.weeklyFrequency} treinos.
4. Aplique periodização: adapte o volume e intensidade progressivamente.
5. DETALHAMENTO OBRIGATÓRIO: Para CADA treino, quebre em fases e especifique Pace Alvo e Zona de FC para cada parte (ex: 1km a X pace, 2km a Y pace).
6. Para INTERVALADOS, detalhe cada série com precisão.

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
                    "fases": {
                        "aquecimento": { "duracao_min": 10, "descricao": "Trote leve", "pace_sugerido": "6:00", "intensidade": "Leve" },
                        "principal": {
                            "tipo_estrutura": "continuo",
                            "descricao_geral": "5km progressivos",
                            "segmentos": [
                                { "distancia_km": 1, "pace_alvo": "5:50", "zona_fc": "Z2", "descricao": "Aquecimento final" },
                                { "distancia_km": 2, "pace_alvo": "5:40", "zona_fc": "Z3", "descricao": "Ritmo firme" },
                                { "distancia_km": 2, "pace_alvo": "5:30", "zona_fc": "Z4", "descricao": "Forçar um pouco" }
                            ],
                            "como_executar": ["Comece tranquilo", "Acelere a cada km"]
                        },
                        "desaquecimento": { ... }
                    },
                    "dicas_execucao": [...],
                    "sensacao_esperada": "...",
                    "descricao_completa": "..."
                },
                {
                    "dia": 3,
                    "tipo": "Intervalado",
                    "titulo": "🔥 Tiros 800m",
                    "objetivo_sessao": "Desenvolver velocidade e VO2max",
                    "distancia_total_km": 7,
                    "tempo_estimado_min": 45,
                    "fases": {
                        "aquecimento": { "duracao_min": 15, "descricao": "Trote progressivo + educativos", "pace_sugerido": "6:00", "intensidade": "Leve" },
                        "principal": {
                            "tipo_estrutura": "intervalado",
                            "descricao_geral": "6x800m com recuperação ativa",
                            "series": [
                                {
                                    "repeticoes": 6,
                                    "distancia_m": 800,
                                    "pace_alvo": "4:15",
                                    "zona_fc": "Z4",
                                    "descanso_tipo": "trote",
                                    "descanso_duracao": "200m em trote leve (Z1)"
                                }
                            ],
                            "como_executar": [
                                "Após cada tiro de 800m, faça 200m de trote leve (não pare totalmente)",
                                "Use o trote para recuperar a respiração antes do próximo tiro",
                                "Mantenha o pace consistente em todos os tiros"
                            ]
                        },
                        "desaquecimento": { "duracao_min": 10, "descricao": "Trote leve + alongamento", "pace_sugerido": "6:30", "intensidade": "Muito leve" }
                    },
                    "dicas_execucao": ["Não arranque forte demais no primeiro tiro", "Hidrate-se entre as séries"],
                    "sensacao_esperada": "Respiração intensa durante os tiros, mas recuperável no descanso",
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