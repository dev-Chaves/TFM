// ============================================
// ESTRUTURA DETALHADA DE TREINO - REAL COACH
// ============================================

export interface FaseTreino {
    duracao_min: number;
    descricao: string;
    pace_sugerido?: string;           // Ex: "6:30-7:00 min/km"
    intensidade?: string;             // Ex: "Leve", "Moderado"
}

export interface SerieIntervalo {
    repeticoes: number;
    distancia_m: number;
    pace_alvo: string;                // Ex: "4:30 min/km"
    descanso_tipo: "parado" | "trote" | "caminhada";
    descanso_duracao: string;         // Ex: "90 segundos" ou "200m trote"
}

export interface FasePrincipal {
    tipo_estrutura: "continuo" | "intervalado" | "progressivo" | "fartlek";
    descricao_geral: string;
    
    // Para treinos contínuos
    pace_alvo?: string;
    zona_fc?: number;                 // 1-5 (zonas de FC)
    
    // Para intervalados
    series?: SerieIntervalo[];
    
    // Instruções detalhadas passo-a-passo
    como_executar: string[];
}

export interface FasesTreino {
    aquecimento: FaseTreino;
    principal: FasePrincipal;
    desaquecimento: FaseTreino;
}

export interface TreinoAI {
    dia: number;
    tipo: "Rodagem" | "Longo" | "Intervalado" | "Tempo Run" | "Regenerativo" | "Fartlek";
    titulo: string;                   // Ex: "🔥 Tiros de Velocidade 400m"
    objetivo_sessao: string;          // Ex: "Desenvolver velocidade máxima"
    distancia_total_km: number;
    tempo_estimado_min: number;
    
    fases: FasesTreino;
    
    dicas_execucao: string[];         // Dicas práticas do coach
    sensacao_esperada: string;        // Ex: "Deve terminar cansado, mas não exausto"
    
    // Campo legado para compatibilidade
    descricao_completa: string;
}

export interface PlanoSemanalAI {
    resumo_semana: string;
    objetivo: string;
    mensagem_coach: string;           // Mensagem motivacional personalizada
    foco_semana: string[];            // Ex: ["Velocidade", "Resistência"]
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