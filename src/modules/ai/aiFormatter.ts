import { StravaActivity } from "../../shared/schemas";

/**
 * Interface para atividade formatada para consumo da IA
 */
export interface CleanActivityForAI {
    data: string;
    nome: string;
    tipo: string;
    distancia_km: string; // "5.10 km"
    tempo_movimento: string; // "34 min"
    pace_medio: string; // "6:41 min/km"
    elevacao: string; // "27m"
    frequencia_cardiaca: string;
}


export function calculatePace(speedMetersPerSecond: number): string {
    if (speedMetersPerSecond === 0) return "0:00";
    const minutesPerKm = 16.666666666667 / speedMetersPerSecond;
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Converte string de pace (ex: "6:30") para minutos decimais (ex: 6.5)
 */
export function parsePace(paceStr: string): number {
    const cleaned = paceStr.trim();
    const [min, sec] = cleaned.split(':').map(Number);
    if (isNaN(min)) return 0;
    return min + (sec || 0) / 60;
}

/**
 * Converte minutos decimais para string de pace (ex: 6.5 -> "6:30")
 */
export function formatPaceFromDecimal(minutes: number): string {
    const min = Math.floor(minutes);
    const sec = Math.round((minutes - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function formatActivyForAI(raw: StravaActivity): CleanActivityForAI {

    const date = new Date(raw.start_date).toLocaleDateString('pt-BR');
    const distanceKm = (raw.distance / 1000).toFixed(2);
    const timeMin = Math.round(raw.moving_time / 60);
    const pace = calculatePace(raw.average_speed);
    const heartRate = raw.average_heartrate 
        ? `${Math.round(raw.average_heartrate)} bpm` 
        : "N/A";

    return {
        data: date,
        nome: raw.name,
        tipo: raw.sport_type === 'Run' ? 'Corrida' : raw.sport_type,
        distancia_km: `${distanceKm} km`,
        tempo_movimento: `${timeMin} min`,
        pace_medio: `${pace} min/km`,
        elevacao: `${raw.total_elevation_gain}m`,
        frequencia_cardiaca: heartRate
    };
}

/**
 * Calcula a baseline do atleta com base nas atividades recentes.
 * Retorna média de pace, maior distância e melhor pace.
 */
export function calculateBaseline(activities: StravaActivity[]) {
    if (activities.length === 0) {
        return {
            avgPace: "N/A",
            maxDistance: 0,
            bestPace: "N/A"
        };
    }

    const runs = activities.filter(a => a.sport_type === 'Run');
    
    if (runs.length === 0) {
        return {
            avgPace: "N/A",
            maxDistance: 0,
            bestPace: "N/A"
        };
    }

    // 1. Média de Pace (considerando a velocidade média ponderada pela distância)
    const totalDistance = runs.reduce((acc, a) => acc + a.distance, 0);
    const totalTime = runs.reduce((acc, a) => acc + a.moving_time, 0);
    const avgSpeed = totalDistance / totalTime;
    const avgPace = calculatePace(avgSpeed);

    // 2. Maior Distância
    const maxDistance = Math.max(...runs.map(a => a.distance)) / 1000;

    // 3. Melhor Pace (Maior velocidade média em uma atividade de pelo menos 2km)
    const significantRuns = runs.filter(a => a.distance >= 2000);
    const bestSpeed = significantRuns.length > 0 
        ? Math.max(...significantRuns.map(a => a.average_speed))
        : Math.max(...runs.map(a => a.average_speed));
    const bestPace = calculatePace(bestSpeed);

    return {
        avgPace,
        maxDistance: parseFloat(maxDistance.toFixed(2)),
        bestPace
    };
}   