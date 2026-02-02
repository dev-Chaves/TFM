import { z } from "zod";

/**
 * Schema para evento de webhook do Strava
 */
export const StravaWebhookEventSchema = z.object({
    object_type: z.enum(["activity", "athlete"]),
    object_id: z.number(),
    aspect_type: z.enum(["create", "update", "delete"]),
    owner_id: z.number(),
    subscription_id: z.number(),
    event_time: z.number(),
    updates: z.record(z.string(), z.unknown()).optional(),
});

export type StravaWebhookEvent = z.infer<typeof StravaWebhookEventSchema>;

/**
 * Schema para resposta de registro de webhook
 */
export const WebhookRegistrationResponseSchema = z.object({
    id: z.number(),
    callback_url: z.string().optional(),
    created_at: z.string().optional(),
});

export type WebhookRegistrationResponse = z.infer<typeof WebhookRegistrationResponseSchema>;

/**
 * Response types
 */
export interface RegisterWebhookResponse {
    message: string;
    details: WebhookRegistrationResponse | unknown;
}
