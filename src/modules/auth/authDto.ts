import { z } from "zod";

// =============================================================================
// AUTH SCHEMAS (Zod)
// =============================================================================

/**
 * Schema para atleta retornado pela API do Strava
 */
export const StravaAthleteResponseSchema = z.object({
    id: z.number(),
    firstname: z.string(),
    lastname: z.string(),
    bio: z.string().nullable(),
    city: z.string().nullable(),
    profile: z.string(),
    sex: z.string().optional(),
    weight: z.number().optional(),
});

export type StravaAthleteResponse = z.infer<typeof StravaAthleteResponseSchema>;

/**
 * Schema para resposta de token do Strava
 */
export const StravaTokenResponseSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_at: z.number(),
    athlete: StravaAthleteResponseSchema,
});

export type StravaTokenResponse = z.infer<typeof StravaTokenResponseSchema>;

/**
 * Schema para resposta de autenticação interna
 */
export const AuthResponseSchema = z.object({
    id: z.number(),
    strava_id: z.number(),
    strava_name: z.string(),
    first_login: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;