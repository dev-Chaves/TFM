export interface authRequest{
    id: number;
    firstname: string;
    lastname: string;
    bio: string | null;
    city: string | null;
    profile: string; 
    sex?: string;
    weight?: number;
}

export interface authResponse {
    id: number;
    strava_id: number;
    strava_name: string;
    first_login: string
}