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
    PlanoMensalAI,
    // Schemas
    FaseTreinoSchema,
    SerieIntervaloSchema,
    FasePrincipalSchema,
    FasesTreinoSchema,
    WorkoutStructureSchema,
    TreinoAISchema,
    PlanoSemanalAISchema,
    PlanoMensalAISchema,
    AiFeedbackWrapperSchema,
    WorkoutStatus,
    DashboardCoachFeedback,
    DashboardItem,
    SaveWorkoutDTO
} from "../../shared/schemas";

// Re-export types for backwards compatibility
export type { 
    FaseTreino, 
    SerieIntervalo, 
    FasePrincipal, 
    FasesTreino,
    TreinoAI,
    PlanoSemanalAI,
    PlanoMensalAI,
    WorkoutStatus,
    DashboardCoachFeedback,
    DashboardItem,
    SaveWorkoutDTO
};

// Re-export schemas
export { 
    TreinoAISchema as TreinoAiSchema, 
    PlanoSemanalAISchema as PlanoSemanalSchema,
    PlanoMensalAISchema as PlanoMensalSchema
};