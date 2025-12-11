import { Context } from "hono";
import userRepository from "../users/userRepository";
import activityService from "../acitivies/activityService";
import webhookService from "./webhookService";

const webHookController = {

    async verifyWebHook(c: Context) {

    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");   

    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFICATION_TOKEN) {
        console.log("WEBHOOK_VERIFIED");
        return c.json({"hub.challenge": challenge});
    }

    return c.json({error: "Token Inválido"}, 403);

    },

    async handleEvent(c: Context) {

        try{

            const event = await c.req.json();

            const stravaId = event.object_id;

            const user = await userRepository.getUserByStravaId(stravaId);

            if(!user){
                throw new Error("Usuário não encontrado para o Strava ID: " + stravaId);
            }

            await activityService.syncActivies(user.id).catch((err) => {
                console.error("Erro ao sincronizar atividades para o usuário ID: " + user.id + " - " + err.message);
            });
            
            return c.text("Evento processado com sucesso", 200); 
                

        }catch(err) {
            console.error("Erro ao processar evento do webhook:", err);
            return c.json({error: "Erro ao processar evento"}, 500);
        }

    },

    async register(c: Context){

        const url = c.req.url;

        if(!url) return c.json({error: "URL de callback não fornecida"}, 400);

        try {
            
            const result = await webhookService.registerWebhook(url);

            return c.json(result, 200);

        } catch (error) {
        
            return c.json({error: "Erro ao registrar webhook"}, 500);

        }

    }

}

export default webHookController;