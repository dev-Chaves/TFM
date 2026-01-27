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
