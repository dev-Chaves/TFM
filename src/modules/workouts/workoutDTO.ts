export interface TreinoAI {
    dia: number; 
    tipo: string;
    descricao_completa: string;
    distancia_estimada_km: number;
    tempo_estimado_min: number;
}

export interface PlanoSemanalAI {
    resumo_semana: string;
    objetivo: string;
    treinos: TreinoAI[];
}

export interface SaveWorkoutDTO {
  userId: number;
  scheduleDate: Date;
  description: string;
  structure?: Record<string, any>;
  completedActivityId?: number;
  aiFeedback?: string;
}