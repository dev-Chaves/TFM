import { RegisterWebhookResponse } from "./webhookDto";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("WebhookService");

const webhookService = {

    /**
     * Registra um webhook no Strava para receber notificações de eventos
     */
    async registerWebhook(callbackUrl: string): Promise<RegisterWebhookResponse> {

        log.info({ callbackUrl }, "Iniciando registro de webhook");

        const params = new URLSearchParams({
            client_id: process.env.CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
            verify_token: process.env.WEBHOOK_VERIFICATION_TOKEN!,
            callback_url: callbackUrl,
        });

        try {
            // Busca webhooks existentes
            const viewResponse = await fetch(
                `https://www.strava.com/api/v3/push_subscriptions?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`
            );
        
            const currentViews: unknown = await viewResponse.json();

            // Deleta webhook existente se houver
            if (Array.isArray(currentViews) && currentViews.length > 0) {
                const existingWebhook = currentViews[0] as { id: number };
                log.info({ webhookId: existingWebhook.id }, "Deletando webhook existente");
                await fetch(
                    `https://www.strava.com/api/v3/push_subscriptions/${existingWebhook.id}?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`, 
                    { method: "DELETE" }
                );
            }

            // Registra novo webhook
            const response = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
                method: "POST",
                body: params
            });

            const data: unknown = await response.json();
        
            if (!response.ok) {
                log.error({ status: response.status, data }, "Erro ao registrar webhook no Strava");
                throw new Error(`Erro Strava: ${JSON.stringify(data)}`);
            }

            log.info("Webhook registrado com sucesso no Strava");

            return {
                message: "Webhook registrado com sucesso!",
                details: data
            };
            
        } catch (error) {
            log.error({ error: error instanceof Error ? error.message : error }, "Erro ao registrar webhook");
            throw error;
        }

    }

};

export default webhookService;