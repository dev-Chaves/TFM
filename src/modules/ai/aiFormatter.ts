interface CleanActivityForAI {
    data: string;
    nome: string;
    tipo: string;
    distancia_km: string; // "5.10 km"
    tempo_movimento: string; // "34 min"
    pace_medio: string; // "6:41 min/km"
    elevacao: string; // "27m"
}


function calculatePace(speedMetersPerSecond: number): string {
    if (speedMetersPerSecond === 0) return "0:00";
    const minutesPerKm = 16.666666666667 / speedMetersPerSecond;
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatActivyForAI(raw: any): CleanActivityForAI {

    const date = new Date(raw.start_date).toLocaleDateString('pt-BR');
    const distanceKm = (raw.distance / 1000).toFixed(2);
    const timeMin = Math.round(raw.moving_time / 60);
    const pace = calculatePace(raw.average_speed);

    return {
        data: date,
        nome: raw.name,
        tipo: raw.sport_type === 'Run' ? 'Corrida' : raw.sport_type,
        distancia_km: `${distanceKm} km`,
        tempo_movimento: `${timeMin} min`,
        pace_medio: `${pace} min/km`,
        elevacao: `${raw.total_elevation_gain}m`
    };
}   