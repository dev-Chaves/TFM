export interface userRequest{
    id: number;
    firstname: string;
    lastname: string;
    bio: string | null;
    city: string | null;
    profile: string; 
    sex?: string;
    weight?: number;
}

export interface userResponse {
    id: number;
    strava_id: number;
    strava_name: string;
}