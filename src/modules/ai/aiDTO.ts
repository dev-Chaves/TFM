export interface GoalConfig {

    targetDistanceKm: number;
    targetDate?: string; 
    weeklyFrequency: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    text?: string;

}

export interface FeedBackAI {
    score: number; // 0 a 10
    status: 'Cumpriu' | 'Parcial' | 'Não Cumpriu' | 'Superou';
    comentario_coach: string;
    pontos_positivos: string[];
    pontos_atencao: string[];
}