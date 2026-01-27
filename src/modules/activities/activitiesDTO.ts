import { calculatePace } from "../ai/aiFormatter";

export interface SaveActivityDTO {
  userId: number;
  stravaActivityId: number;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  startDate: Date;
  rawData: Record<string, any>;
}

export interface SaveActivitiesDTO extends Array<SaveActivityDTO> {}

export interface ActivityResponseDTO {
  id: number;
  stravaId: number;
  name: string;
  type: string;
  startDate: string;
  distanceKm: number;
  movingTime: string; // "HH:MM:SS" ou "MM:SS"
  pace: string;
}

export function toActivityResponseDTO(entity: any): ActivityResponseDTO {
    
    // Cálculo do Pace
    let pace = "0:00";
    if (entity.movingTime > 0 && entity.distance > 0) {
        const speed = entity.distance / entity.movingTime; // m/s
        pace = calculatePace(speed);
    }

    // Formatação Tempo (Segundos -> HH:MM:SS)
    const hours = Math.floor(entity.movingTime / 3600);
    const minutes = Math.floor((entity.movingTime % 3600) / 60);
    const seconds = entity.movingTime % 60;
    
    const timeFormatted = [
        hours > 0 ? hours.toString().padStart(2, '0') : null,
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].filter(Boolean).join(':');

    return {
        id: entity.id,
        stravaId: Number(entity.stravaActivityId),
        name: entity.name,
        type: entity.type,
        startDate: new Date(entity.startDate).toISOString(),
        distanceKm: Number((entity.distance / 1000).toFixed(2)),
        movingTime: timeFormatted,
        pace: pace
    };
}
