import Groq from "groq-sdk";
import userRepository from "../users/userRepository";
import activityRepository from "../acitivies/activityRepository";
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
            Você é um Treinador de Corrida de Rua de Elite (Running Coach).
            Sua metodologia é baseada em periodização segura, evitando lesões e focando em consistência.
            
            DIRETRIZES:
            - Apenas corrida de rua (nada de esteira ou trilha, salvo se especificado).
            - Use o sistema métrico (km, min/km).
            - Os treinos devem ter: Aquecimento, Parte Principal e Desaquecimento.
            - Tipos de treino permitidos: Rodagem (leve), Longo, Intervalado (Tiros), Tempo Run (Ritmo), Regenerativo.
            - Responda EXCLUSIVAMENTE em formato JSON.
        `;

        const userPrompt = `
            Crie um plano de treino semanal para este atleta:

            PERFIL DO ATLETA:
            - Nome: ${user.name}
            - Idade: Calcular baseado em ${user.dateOfbirth} (ou assuma 30 se nulo)
            - Peso: ${user.weight}kg
            - Nível: ${goal.experienceLevel}
            
            OBJETIVO ATUAL:
            - Meta Principal: ${goal.targetDistanceKm}km
            - Frequência Semanal: ${goal.weeklyFrequency} dias de treino
            - Data da Prova/Meta: ${goal.targetDate || "Não definida"}
            - Nota Adicional: "${goal.text}"

            HISTÓRICO RECENTE (Últimos treinos realizados):
            ${historyContext}

            Com base no histórico (especialmente o Pace Médio recente), estipule ritmos realistas para os treinos sugeridos.
            
            SAÍDA ESPERADA (JSON):
            {
                "resumo_semana": "Texto motivacional curto explicando o foco da semana",
                "objetivo": "Descrição miníma do objetivo do usuário mais explicação do porquê",
                "treinos": [
                    {
                        "dia": 1,
                        "tipo": "Intervalado",
                        "descricao_completa": "Aquecimento 10min trote + 5x 400m forte (pace X) com 1min descanso + 10min desaquecimento",
                        "distancia_estimada_km": 6,
                        "tempo_estimado_min": 40
                    }
                    // ... repetir para os dias de treino (total ${goal.weeklyFrequency})
                ]
            }
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

    async generateWorkoutFeedback(userId: number, planned: any, actual: any) {

        const user = await userRepository.getUserById(userId);

        if(!user) throw new Error("Usuário não encontrado");

        let splitsTexto = "Não disponível";
        
        if (actual.splits_metric && Array.isArray(actual.splits_metric)) {
            splitsTexto = actual.splits_metric
                .map((split: any, index: number) => {
                    const pace = calculatePace(split.average_speed);
                    return `Km ${index + 1}: ${pace}`;
                })
                .join(" | "); // Ex: "Km 1: 5:00 | Km 2: 4:55 | Km 3: 5:10"
        }

        const systemPrompt = `... (seu system prompt) ...`;

        const userPrompt = `
            PLANEJADO:
            - Tipo: ${planned.tipo}
            - Meta: ${planned.distancia_km}km
            - Descrição: ${planned.description || "N/A"}

            REALIZADO:
            - Média Geral: ${calculatePace(actual.average_speed)} min/km
            - Distância Total: ${(actual.distance / 1000).toFixed(2)} km
            
            PARCIAIS (SPLITS):
            ${splitsTexto}

            Analise se o atleta manteve o ritmo constante ou se houve quebra/tiros baseando-se nos parciais.
        `;
        
        try {
            const completion = await groq.chat.completions.create({
            messages: [
                {role: "system", content: systemPrompt},
                {role: "user", content: userPrompt}
            ],
            model: "llama-3.3-70b-versatile",
        });

        const content = completion.choices[0].message.content;

        if(!content) throw new Error("Resposta da IA inválida");

        const aiFeedback = JSON.parse(content);

        await workoutService.saveAiFeedback(planned.id, { feedbackText: aiFeedback });

        } catch (error) {
            console.error(`[IA Coach] Erro ao analisar treino ${planned.id}:`, error);
        }

    },

};

export default aiService;