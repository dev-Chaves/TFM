import { Context } from "hono";
import aiService from "./aiService";

const aiController = {

    async generateWorkoutPlan(c: Context) {

        try{
            
            const response = await aiService.generateWorkoutPlan(Number(c.req.param('id')));

            const plan = JSON.parse(response.choices[0].message.content || "{}");

            return c.json(plan);

        }catch(err){

            console.error(err);

            return c.json({
                error: "Erro interno no servidor."
            }, 500)

        }

    }

}

export default aiController;