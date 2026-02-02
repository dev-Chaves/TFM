import { z } from "zod";
import { 
    FaseTreino,
    SerieIntervalo, 
    FasePrincipal,
    FasesTreino,
    WorkoutStructure,
    AiFeedbackWrapper,
    TreinoAI,
    PlanoSemanalAI,
    // Schemas
    FaseTreinoSchema,
    SerieIntervaloSchema,
    FasePrincipalSchema,
    FasesTreinoSchema,
    WorkoutStructureSchema,
    TreinoAISchema,
    PlanoSemanalAISchema,
    AiFeedbackWrapperSchema
} from "../../shared/schemas";

// Re-export types for backwards compatibility
export type { 
    FaseTreino, 
    SerieIntervalo, 
    FasePrincipal, 
    FasesTreino,
    TreinoAI,
    PlanoSemanalAI 
};

// Re-export schemas
export { 
    TreinoAISchema as TreinoAiSchema, 
    PlanoSemanalAISchema as PlanoSemanalSchema 
};

/**
 * DTO para salvar workout no banco de dados
 */
export interface SaveWorkoutDTO {
  userId: number;
  scheduleDate: Date;
  description: string;
  structure?: WorkoutStructure;
  completedActivityId?: number;
  aiFeedback?: AiFeedbackWrapper;
}

/**
 * Status possíveis de um workout no dashboard
 */
export type WorkoutStatus = 'Pendente' | 'Concluido' | 'Perdido';

/**
 * Dados do coach (feedback da IA) para exibição no dashboard
 */
export interface DashboardCoachFeedback {
    score: number;
    status: string;
    emoji: string;
    titulo_feedback: string;
    comentario: string;
    analise_splits: string;
    aspectos_positivos: string[];
    areas_melhoria: string[];
    dica_proxima: string;
}

/**
 * Item do dashboard com todos os dados do workout
 */
export interface DashboardItem {
    id: number;
    data: string; // YYYY-MM-DD
    status: WorkoutStatus;
    description: string;
    
    // Campos básicos
    tipo: string;
    titulo: string;
    objetivo_sessao: string;
    distancia_planejada: number;
    tempo_estimado_min: number;
    pace_planejado: string;
    
    // Estrutura detalhada de fases
    fases: FasesTreino | null;
    
    // Dicas e sensação esperada
    dicas_execucao: string[];
    sensacao_esperada: string;
    
    // Contexto do plano
    contexto_semana: string;
    mensagem_coach: string;
    foco_semana: string[];
    
    // Dados realizados (quando completado)
    distancia_realizada?: number;
    pace_realizado?: string;

    // Feedback do coach
    coach?: DashboardCoachFeedback;
}