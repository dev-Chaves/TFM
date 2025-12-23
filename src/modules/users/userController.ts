import userService from "./userService";
import { Context } from "hono";
import { DayOfWeek } from "../ai/aiDTO";

// =============================================
// Tipos para o payload do Frontend
// =============================================
interface FrontendGoalPayload {
    targetRace: string;
    raceDistance: string;
    targetTime: string;
    raceDate: string;
    currentLevel: string;
    weeklyAvailability: string;
    availableDays: number[];
    additionalNotes: string;
}

// =============================================
// Funções auxiliares de transformação
// =============================================

/**
 * Mapeia a distância da corrida para quilômetros
 * "5k" -> 5, "10k" -> 10, "21k" -> 21, "42k" -> 42, "ultra" -> 50
 */
function mapRaceDistanceToKm(raceDistance: string): number {
    const distanceMap: Record<string, number> = {
        "5k": 5,
        "10k": 10,
        "21k": 21,
        "42k": 42,
        "ultra": 50
    };
    return distanceMap[raceDistance.toLowerCase()] ?? 5;
}

/**
 * Mapeia o nível de experiência do português para o inglês
 * "iniciante" -> "beginner", "intermediario" -> "intermediate", "avancado" -> "advanced"
 */
function mapExperienceLevel(currentLevel: string): 'beginner' | 'intermediate' | 'advanced' {
    const levelMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
        "iniciante": "beginner",
        "intermediario": "intermediate",
        "intermediário": "intermediate",
        "avancado": "advanced",
        "avançado": "advanced"
    };
    return levelMap[currentLevel.toLowerCase()] ?? "beginner";
}

/**
 * Concatena as informações da corrida, tempo alvo e notas adicionais
 */
function buildGoalText(targetRace: string, targetTime: string, additionalNotes: string): string {
    const parts = [
        targetRace ? `Prova: ${targetRace}` : "",
        targetTime ? `Tempo alvo: ${targetTime}` : "",
        additionalNotes ? `Notas: ${additionalNotes}` : ""
    ].filter(Boolean);
    
    return parts.join(" | ");
}

/**
 * Transforma o payload do Frontend para o formato GoalConfig esperado pelo Backend
 */
function transformFrontendPayloadToGoalConfig(payload: FrontendGoalPayload) {
    return {
        targetDistanceKm: mapRaceDistanceToKm(payload.raceDistance),
        targetDate: payload.raceDate,
        weeklyFrequency: parseInt(payload.weeklyAvailability, 10) || 3,
        experienceLevel: mapExperienceLevel(payload.currentLevel),
        text: buildGoalText(payload.targetRace, payload.targetTime, payload.additionalNotes),
        availableDays: (payload.availableDays ?? []) as DayOfWeek[]
    };
}

// =============================================
// Controller
// =============================================
const userController = {

    async updateGoal(c: Context) {

        const userId = Number(c.get("userId"));

        if(Number.isNaN(userId)) return c.json({error: `ID Inválido`}, 400);

        const frontendPayload: FrontendGoalPayload = await c.req.json();
        
        // Transforma o payload do frontend para o formato GoalConfig
        const goalData = transformFrontendPayloadToGoalConfig(frontendPayload);
        
        try{    
            await userService.updateGoal(userId, goalData);
        
            return c.json({message: "Objetivo atualizado com sucesso."}); 

        } catch (error) {
            return c.json({error: "Erro ao atualizar objetivo."}, 500);
        }
    }

}

export default userController;