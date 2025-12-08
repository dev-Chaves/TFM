import { Context } from "hono";
import aiService from "./aiService";

const aiController = {

    async generateWorkoutPlan(c: Context) {

        try{
            
            const response = await aiService.generateWorkoutPlan();

            return c.json(response.choices[0].message);

        }catch(err){

            console.error(err);

            return c.json({
                error: "Erro interno no servidor."
            }, 500)

        }

    }

}

export default aiController;