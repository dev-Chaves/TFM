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

export interface DashboardItem {
    id: number;
    data: string; // YYYY-MM-DD
    status: 'Pendente' | 'Concluido' | 'Perdido';
    description: string;
    
    titulo: string;
    planeado: {
        distancia: string;
        tempo: string;
        tipo: string;
    };

    realizado?: {
        strava_id: number;
        distancia: string;
        pace: string;
        tempo: string;
    };

    coach?: {
        nota: number;
        comentario: string;
        tags: string[]; 
    };
}