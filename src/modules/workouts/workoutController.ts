import { Context } from "hono";
import workoutService from "./workoutService";

const workoutController = {

    async saveWorkout(c: Context) {

        const userId = Number(c.req.param('id'));

        if(Number.isNaN(userId)) return c.json({error: `ID Inválido`}, 400);

        const workoutData = await c.req.json();
        
        try{    
            await workoutService.saveWorkout(userId, workoutData);
        
            return c.json({message: "Treino salvo com sucesso."}); 

        } catch (error) {
            return c.json({error: "Erro ao salvar treino."}, 500);
        }

    },

};

export default workoutController;