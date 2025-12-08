export interface GoalConfig {

    targetDistanceKm: number;
    targetDate?: string; 
    weeklyFrequency: number;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    text?: string;

}