import { calculatePace } from "../ai/aiFormatter";
import { StravaActivity } from "../../shared/schemas";

export interface SaveActivityDTO {
  userId: number;
  stravaActivityId: number;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  startDate: Date;
  rawData: StravaActivity;
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

/**
 * Interface para entidade de atividade do banco de dados
 */
export interface ActivityEntity {
    id: number;
    userId: number;
    stravaActivityId: number | null;
    name: string | null;
    type: string | null;
    distance: number | null;
    movingTime: number | null;
    startDate: Date | null;
    rawData: unknown;
}

export function toActivityResponseDTO(entity: ActivityEntity): ActivityResponseDTO {
    
    const movingTime = entity.movingTime ?? 0;
    const distance = entity.distance ?? 0;

    // Cálculo do Pace
    let pace = "0:00";
    if (movingTime > 0 && distance > 0) {
        const speed = distance / movingTime; // m/s
        pace = calculatePace(speed);
    }

    // Formatação Tempo (Segundos -> HH:MM:SS)
    const hours = Math.floor(movingTime / 3600);
    const minutes = Math.floor((movingTime % 3600) / 60);
    const seconds = movingTime % 60;
    
    const timeFormatted = [
        hours > 0 ? hours.toString().padStart(2, '0') : null,
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].filter(Boolean).join(':');

    return {
        id: entity.id,
        stravaId: Number(entity.stravaActivityId),
        name: entity.name ?? "",
        type: entity.type ?? "",
        startDate: entity.startDate ? new Date(entity.startDate).toISOString() : "",
        distanceKm: Number((distance / 1000).toFixed(2)),
        movingTime: timeFormatted,
        pace: pace
    };
}
