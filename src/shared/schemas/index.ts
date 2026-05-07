import { z } from "zod";

// =============================================================================
// STRAVA SCHEMAS
// =============================================================================

/**
 * Schema para splits de atividades Strava (km a km)
 */
export const StravaSplitMetricSchema = z.object({
    distance: z.number(),
    elapsed_time: z.number(),
    elevation_difference: z.number(),
    moving_time: z.number(),
    split: z.number(),
    average_speed: z.number(),
    pace_zone: z.number(),
});

export type StravaSplitMetric = z.infer<typeof StravaSplitMetricSchema>;

/**
 * Schema para atleta do Strava (nested object)
 */
export const StravaAthleteSchema = z.object({
    id: z.number(),
    resource_state: z.number(),
});

export type StravaAthlete = z.infer<typeof StravaAthleteSchema>;

/**
 * Schema para mapa do Strava (nested object)
 */
export const StravaMapSchema = z.object({
    id: z.string(),
    summary_polyline: z.string(),
    resource_state: z.number(),
});

export type StravaMap = z.infer<typeof StravaMapSchema>;

/**
 * Schema completo para atividades do Strava
 */
export const StravaActivitySchema = z.object({
    id: z.number(),
    resource_state: z.number(),
    external_id: z.string().optional(),
    upload_id: z.number().optional(),
    athlete: StravaAthleteSchema,
    name: z.string(),
    distance: z.number(),
    moving_time: z.number(),
    elapsed_time: z.number(),
    total_elevation_gain: z.number(),
    type: z.string(),
    sport_type: z.string(),
    start_date: z.string(),
    start_date_local: z.string(),
    timezone: z.string(),
    utc_offset: z.number(),
    start_latlng: z.tuple([z.number(), z.number()]).optional(),
    end_latlng: z.tuple([z.number(), z.number()]).optional(),
    location_city: z.string().nullable().optional(),
    location_state: z.string().nullable().optional(),
    location_country: z.string().nullable().optional(),
    map: StravaMapSchema.optional(),
    average_speed: z.number(),
    max_speed: z.number(),
    average_cadence: z.number().optional(),
    average_heartrate: z.number().optional(),
    max_heartrate: z.number().optional(),
    elev_high: z.number().optional(),
    elev_low: z.number().optional(),
    splits_metric: z.array(StravaSplitMetricSchema).optional(),
});

export type StravaActivity = z.infer<typeof StravaActivitySchema>;

// =============================================================================
// WORKOUT STRUCTURE SCHEMAS
// =============================================================================

/**
 * Schema para fase de aquecimento/desaquecimento
 */
export const FaseTreinoSchema = z.object({
    duracao_min: z.number(),
    descricao: z.string(),
    pace_sugerido: z.string().optional(),
    intensidade: z.string().optional(),
});

export type FaseTreino = z.infer<typeof FaseTreinoSchema>;

/**
 * Schema para séries de intervalados
 */
export const SerieIntervaloSchema = z.object({
    repeticoes: z.number(),
    distancia_m: z.number(),
    pace_alvo: z.string(),
    zona_fc: z.string().optional(), // Nova prop
    descanso_tipo: z.enum(["parado", "trote", "caminhada"]),
    descanso_duracao: z.string(),
});

export type SerieIntervalo = z.infer<typeof SerieIntervaloSchema>;


/**
 * Schema para segmentos do treino (km a km ou blocos)
 */
export const TreinoSegmentoSchema = z.object({
    distancia_km: z.number(),
    pace_alvo: z.string(), // Obrigatório
    zona_fc: z.string(),   // Obrigatório (ex: "Z2")
    descricao: z.string().optional(),
});

export type TreinoSegmento = z.infer<typeof TreinoSegmentoSchema>;

/**
 * Schema para fase principal do treino
 */
export const FasePrincipalSchema = z.object({
    tipo_estrutura: z.enum(["continuo", "intervalado", "progressivo", "fartlek"]),
    descricao_geral: z.string(),
    pace_alvo: z.string().optional(),
    zona_fc: z.number().optional(), // Deprecado, usar segmentos ou serie.zona_fc
    segmentos: z.array(TreinoSegmentoSchema).optional(), // Novo campo
    series: z.array(SerieIntervaloSchema).optional(),
    como_executar: z.array(z.string()),
});

export type FasePrincipal = z.infer<typeof FasePrincipalSchema>;

/**
 * Schema para todas as fases do treino
 */
export const FasesTreinoSchema = z.object({
    aquecimento: FaseTreinoSchema,
    principal: FasePrincipalSchema,
    desaquecimento: FaseTreinoSchema,
});

export type FasesTreino = z.infer<typeof FasesTreinoSchema>;

/**
 * Schema completo para estrutura do workout
 */
export const WorkoutStructureSchema = z.object({
    tipo: z.string(),
    titulo: z.string(),
    objetivo_sessao: z.string(),
    distancia_km: z.number(),
    tempo_min: z.number(),
    fases: FasesTreinoSchema,
    dicas_execucao: z.array(z.string()),
    sensacao_esperada: z.string(),
    contexto_semana: z.string(),
    mensagem_coach: z.string(),
    foco_semana: z.array(z.string()),
});

export type WorkoutStructure = z.infer<typeof WorkoutStructureSchema>;

// =============================================================================
// AI FEEDBACK SCHEMAS
// =============================================================================

/**
 * Schema para conteúdo do feedback da IA
 */
export const AiFeedbackContentSchema = z.object({
    score: z.number(),
    status: z.string(),
    emoji: z.string(),
    titulo_feedback: z.string(),
    comentario_coach: z.string(),
    analise_splits: z.string(),
    pontos_positivos: z.array(z.string()),
    pontos_atencao: z.array(z.string()),
    dica_proxima: z.string(),
    // Campos comparativos preenchidos pelo backend
    pace_alvo_principal: z.string().optional(),
    pace_realizado: z.string().optional(),
    pace_diferenca: z.string().optional(),
    distancia_alvo: z.number().optional(),
    distancia_realizada: z.number().optional(),
});

export type AiFeedbackContent = z.infer<typeof AiFeedbackContentSchema>;

/**
 * Schema wrapper do feedback
 */
export const AiFeedbackWrapperSchema = z.object({
    feedbackText: AiFeedbackContentSchema,
});

export type AiFeedbackWrapper = z.infer<typeof AiFeedbackWrapperSchema>;

// =============================================================================
// AI PLAN SCHEMAS (Resposta da IA para geração de treinos)
// =============================================================================

/**
 * Schema para treino individual gerado pela IA
 */
export const TreinoAISchema = z.object({
    dia: z.union([z.number(), z.string()]),
    tipo: z.string(),
    titulo: z.string(),
    objetivo_sessao: z.string(),
    distancia_total_km: z.number(),
    tempo_estimado_min: z.number(),
    fases: FasesTreinoSchema,
    dicas_execucao: z.array(z.string()),
    sensacao_esperada: z.string(),
    descricao_completa: z.string(),
});

export type TreinoAI = z.infer<typeof TreinoAISchema>;

/**
 * Schema para plano semanal gerado pela IA
 */
export const PlanoSemanalAISchema = z.object({
    resumo_semana: z.string(),
    objetivo: z.string().optional(),
    mensagem_coach: z.string(),
    foco_semana: z.array(z.string()),
    treinos: z.array(TreinoAISchema),
});

export type PlanoSemanalAI = z.infer<typeof PlanoSemanalAISchema>;

/**
 * Schema para uma semana dentro do plano mensal
 */
export const SemanaAISchema = z.object({
    numero_semana: z.number(),
    resumo_semana: z.string(),
    foco_semana: z.array(z.string()),
    treinos: z.array(TreinoAISchema),
});

export type SemanaAI = z.infer<typeof SemanaAISchema>;

/**
 * Schema para plano mensal gerado pela IA
 */
export const PlanoMensalAISchema = z.object({
    objetivo_mensal: z.string(),
    mensagem_coach: z.string(),
    semanas: z.array(SemanaAISchema),
});

export type PlanoMensalAI = z.infer<typeof PlanoMensalAISchema>;


// =============================================================================
// ACTIVITY ENTITY SCHEMA (Para tipagem do retorno do banco de dados)
// =============================================================================

/**
 * Schema para entidade de atividade do banco de dados
 */
export const ActivityEntitySchema = z.object({
    id: z.number(),
    userId: z.number(),
    stravaActivityId: z.number().nullable(),
    name: z.string().nullable(),
    type: z.string().nullable(),
    distance: z.number().nullable(),
    movingTime: z.number().nullable(),
    startDate: z.date().nullable(),
    rawData: StravaActivitySchema.nullable(),
});

export type ActivityEntity = z.infer<typeof ActivityEntitySchema>;

/**
 * DTO de resposta para atividades formatadas para o Dashboard
 */
export interface ActivityResponseDTO {
    id: number;
    stravaId: number;
    name: string;
    type: string;
    startDate: string;
    distanceKm: number;
    movingTime: string; // "HH:MM:SS" ou "MM:SS"
    pace: string;
    average_heartrate?: number;
    total_elevation_gain?: number;
    kudos_count?: number;
    achievement_count?: number;
}

// =============================================================================
// DASHBOARD & DTO SCHEMAS
// =============================================================================

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

// =============================================================================
// GOAL CONFIG SCHEMA
// =============================================================================

/**
 * Schema para dias da semana (0=Domingo, 6=Sábado)
 */
export const DayOfWeekSchema = z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
]);

export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

/**
 * Schema para configuração de objetivo
 */
export const GoalConfigSchema = z.object({
    targetDistanceKm: z.number(),
    targetDate: z.string().optional(),
    weeklyFrequency: z.number(),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    text: z.string().optional(),
    availableDays: z.array(DayOfWeekSchema).optional(),
});

export type GoalConfig = z.infer<typeof GoalConfigSchema>;
