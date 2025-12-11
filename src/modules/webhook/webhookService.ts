const webhookService = {

    async registerWebhook(callbackUrl: string) {

        const params = new URLSearchParams({
            client_id: process.env.CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
            verify_token: process.env.WEBHOOK_VERIFICATION_TOKEN!,
            callback_url: callbackUrl,
        });

        try {
            
            const viewResponse = await fetch(`https://www.strava.com/api/v3/push_subscriptions?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`);
        
            const currentViews = await viewResponse.json();

            if (Array.isArray(currentViews) && currentViews.length > 0) {
                console.log("Deletando subscrição antiga...");
                await fetch(`https://www.strava.com/api/v3/push_subscriptions/${currentViews[0].id}?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}`, {
                    method: "DELETE"
                });
            };

            const response = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
                method: "POST",
                body: params
            });

            const data = await response.json();
        
            if (!response.ok) {
                throw new Error(`Erro Strava: ${JSON.stringify(data)}`);
            }

            return {
                message: "Webhook registrado com sucesso!",
                details: data
            };
            
        } catch (error) {
            
            console.error("Erro ao registrar webhook:", error);
            throw error;

        }

    }

};

export default webhookService;