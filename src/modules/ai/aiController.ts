import { Context } from "hono";
import aiService from "./aiService";

const aiController = {

    async generateWorkoutPlan(c: Context) {

        try{

            const userId = c.get("userId");
            
            const response = await aiService.generateWorkoutPlan(Number(userId));

            return c.json(response);

        }catch(err){

            console.error(err);

            return c.json({
                error: "Erro interno no servidor."
            }, 500)

        }

    }

}

export default aiController;