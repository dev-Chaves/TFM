// Dias da semana: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GoalConfig {
    targetDistanceKm: number;
    targetDate?: string; 
    weeklyFrequency: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    text?: string;
    
    // Dias disponíveis para treinar (ex: [1, 3, 5] = Segunda, Quarta, Sexta)
    availableDays?: DayOfWeek[];
}

export interface FeedBackAI {
    score: number; // 0 a 10
    status: 'Cumpriu' | 'Parcial' | 'Não Cumpriu' | 'Superou';
    comentario_coach: string;
    pontos_positivos: string[];
    pontos_atencao: string[];
}