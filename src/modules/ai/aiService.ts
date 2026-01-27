import Groq from "groq-sdk";
import userRepository from "../users/userRepository";
import activityRepository from "../activities/activityRepository";
import { calculatePace, formatActivyForAI } from "./aiFormatter";
import workoutService from "../workouts/workoutService";

const groq = new Groq({apiKey: process.env.GROQ_API_KEY});

const aiService = {

    async generateWorkoutPlan(userId: number){

        const user = await userRepository.getUserById(userId);

        if(!user) throw new Error("Usuário não encontrado");

        const recentActivities = await activityRepository.getLastActivities(userId, 5);

        const historyContext = recentActivities.map(a => formatActivyForAI(a.rawData)).map(a => 
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
- Periodização inteligente: alternância de estímulos para evolução constante
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
🎯 MISSÃO: Crie um plano de treino semanal personalizado para este atleta.

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
1. Analise o pace médio recente para definir paces realistas
2. Gere exatamente ${goal.weeklyFrequency} treinos numerados sequencialmente (dia: 1, 2, 3...)
3. Dia 1 = amanhã, Dia 2 = depois de amanhã, etc.
4. Varie os tipos de treino para desenvolvimento completo
5. Para INTERVALADOS, detalhe cada série com precisão
6. Inclua dicas práticas de execução

════════════════════════════════════════
📤 FORMATO DE SAÍDA (JSON EXATO)
════════════════════════════════════════
{
    "resumo_semana": "Texto curto explicando o foco da semana (2-3 frases)",
    "objetivo": "Meta do atleta reescrita de forma motivadora",
    "mensagem_coach": "Mensagem pessoal e motivadora para o atleta (use o nome se disponível)",
    "foco_semana": ["Palavra-chave 1", "Palavra-chave 2"],
    "treinos": [
        {
            "dia": 1,
            "tipo": "Intervalado",
            "titulo": "🔥 Tiros de Velocidade 400m",
            "objetivo_sessao": "Desenvolver velocidade e economia de corrida",
            "distancia_total_km": 6,
            "tempo_estimado_min": 45,
            "fases": {
                "aquecimento": {
                    "duracao_min": 10,
                    "descricao": "Trote leve para ativar o corpo",
                    "pace_sugerido": "7:00-7:30 min/km",
                    "intensidade": "Leve"
                },
                "principal": {
                    "tipo_estrutura": "intervalado",
                    "descricao_geral": "5 repetições de 400m em ritmo forte",
                    "series": [
                        {
                            "repeticoes": 5,
                            "distancia_m": 400,
                            "pace_alvo": "4:30 min/km",
                            "descanso_tipo": "trote",
                            "descanso_duracao": "90 segundos"
                        }
                    ],
                    "como_executar": [
                        "1️⃣ Posicione-se em local plano",
                        "2️⃣ Acelere progressivamente nos primeiros 100m",
                        "3️⃣ Mantenha o ritmo constante no meio",
                        "4️⃣ Foque na técnica nos últimos 100m",
                        "5️⃣ Recupere com trote leve entre as séries"
                    ]
                },
                "desaquecimento": {
                    "duracao_min": 10,
                    "descricao": "Trote muito leve + alongamento",
                    "pace_sugerido": "8:00+ min/km",
                    "intensidade": "Muito Leve"
                }
            },
            "dicas_execucao": [
                "Hidrate-se antes do treino",
                "Use tênis com boa resposta",
                "Se sentir dor, interrompa"
            ],
            "sensacao_esperada": "Você deve terminar ofegante nos tiros, mas recuperar durante o descanso",
            "descricao_completa": "Aquecimento 10min + 5x400m (4:30) c/ 90s trote + Desaquecimento 10min"
        }
    ]
}

IMPORTANTE: Gere exatamente ${goal.weeklyFrequency} treinos. Use paces realistas baseados no histórico!
`;


        const completion = await groq.chat.completions.create({
            messages: [
                {role: "system", content: systemPrompt},
                {role: "user", content: userPrompt}
            ],
            model: "llama-3.3-70b-versatile",
            response_format: {type: "json_object"},
        });

        const aiContent = completion.choices[0].message.content;

        if(!aiContent) throw new Error("Resposta da IA inválida");

        const plan = JSON.parse(aiContent);

        await workoutService.saveWorkout(userId, plan);

        return {
            message: "Plano de treino gerado com sucesso.",
            resumo: plan.resumo_semana,
            objetivo: plan.objetivo,
            treinos: plan.treinos
        }

    },

    async generateWorkoutFeedback(userId: number, workoutId: number, planned: any, actual: any) {

        const user = await userRepository.getUserById(userId);

        if(!user) throw new Error("Usuário não encontrado");

        // 1. Formatar Splits
        let splitsTexto = "Não disponível";
        if (actual.splits_metric && Array.isArray(actual.splits_metric)) {
            splitsTexto = actual.splits_metric
                .map((split: any, index: number) => {
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
Tipo: ${planned.tipo || "Corrida"}
Objetivo: ${planned.objetivo_sessao || "Treino padrão"}
Distância Alvo: ${planned.distancia_km || "N/A"}km
Descrição: ${planned.description || "N/A"}

${planned.fases?.principal ? `
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
            const completion = await groq.chat.completions.create({
                messages: [
                    {role: "system", content: systemPrompt},
                    {role: "user", content: userPrompt}
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" }, // Importante: Força o JSON
            });

            const content = completion.choices[0].message.content;

            if(!content) throw new Error("Resposta da IA vazia");

            const aiFeedback = JSON.parse(content);

            await workoutService.saveAiFeedback(workoutId, { feedbackText: aiFeedback });
            
            

        } catch (error) {
            console.error(`[IA Coach] Erro ao analisar treino ${workoutId}:`, error);
        }
    },

};

export default aiService;