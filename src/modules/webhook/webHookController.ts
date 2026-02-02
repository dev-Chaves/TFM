import { Context } from "hono";
import userRepository from "../users/userRepository";
import activityService from "../activities/activityService";
import webhookService from "./webhookService";
import { StravaWebhookEventSchema, StravaWebhookEvent, RegisterWebhookResponse } from "./webhookDto";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("WebhookController");

/**
 * Response types
 */
interface WebhookChallengeResponse {
    "hub.challenge": string;
}

interface ErrorResponse {
    error: string;
}

const webHookController = {

    /**
     * Verifica o webhook do Strava (handshake inicial)
     */
    async verifyWebHook(c: Context): Promise<Response> {

        const mode = c.req.query("hub.mode");
        const token = c.req.query("hub.verify_token");
        const challenge = c.req.query("hub.challenge");   

        if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFICATION_TOKEN) {
            log.info("Webhook verificado com sucesso");
            return c.json<WebhookChallengeResponse>({"hub.challenge": challenge || ""});
        }

        log.warn({ mode, tokenProvided: !!token }, "Tentativa de verificação de webhook com token inválido");
        return c.json<ErrorResponse>({error: "Token Inválido"}, 403);

    },

    /**
     * Processa eventos recebidos do webhook do Strava
     */
    async handleEvent(c: Context): Promise<Response> {

        try {
            const rawEvent: unknown = await c.req.json();

            // Valida o evento com Zod
            const parseResult = StravaWebhookEventSchema.safeParse(rawEvent);
            
            let event: StravaWebhookEvent;
            if (parseResult.success) {
                event = parseResult.data;
            } else {
                log.warn({ error: parseResult.error.message }, "Evento de webhook inválido");
                event = rawEvent as StravaWebhookEvent;
            }

            log.info({ 
                objectType: event.object_type, 
                aspectType: event.aspect_type, 
                ownerId: event.owner_id,
                objectId: event.object_id
            }, "Evento de webhook recebido");

            // owner_id é o Strava ID do atleta
            const stravaId = event.owner_id;

            const user = await userRepository.getUserByStravaId(stravaId);

            if(!user){
                log.warn({ stravaId }, "Usuário não encontrado para evento de webhook");
                return c.text("Evento ignorado - usuário não encontrado", 200);
            }

            log.info({ userId: user.id, stravaId }, "Iniciando sincronização via webhook");

            // Fire-and-forget: sincroniza atividades em background
            activityService.syncActivities(user.id).catch((err: Error) => {
                log.error({ userId: user.id, error: err.message }, "Erro ao sincronizar atividades via webhook");
            });
            
            return c.text("Evento processado com sucesso", 200); 
                

        } catch(err) {
            log.error({ error: err instanceof Error ? err.message : err }, "Erro ao processar evento de webhook");
            return c.json<ErrorResponse>({error: "Erro ao processar evento"}, 500);
        }

    },

    /**
     * Registra o webhook no Strava
     */
    async register(c: Context): Promise<Response> {

        const url = c.req.query("url");

        if(!url) {
            log.warn("Tentativa de registro de webhook sem URL");
            return c.json<ErrorResponse>({error: "URL de callback não fornecida"}, 400);
        }

        log.info({ callbackUrl: url }, "Registrando webhook no Strava");

        try {
            const result: RegisterWebhookResponse = await webhookService.registerWebhook(url);
            log.info("Webhook registrado com sucesso");
            return c.json(result, 200);

        } catch (error) {
            log.error({ error: error instanceof Error ? error.message : error }, "Erro ao registrar webhook");
            return c.json<ErrorResponse>({error: "Erro ao registrar webhook"}, 500);
        }

    }

}

export default webHookController;