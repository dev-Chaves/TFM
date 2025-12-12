import { Context } from "hono";
import workoutService from "./workoutService";

const workoutController = {

    async saveWorkout(c: Context) {

        const userId = c.get("userId");

        if(Number.isNaN(userId)) return c.json({error: `ID Inválido`}, 400);

        const workoutData = await c.req.json();
        
        try{    
            await workoutService.saveWorkout(userId, workoutData);
        
            return c.json({message: "Treino salvo com sucesso."}); 

        } catch (error) {
            return c.json({error: "Erro ao salvar treino."}, 500);
        }

    },

    async getWorkoutByUserId(c: Context){

        const userId = Number(c.req.param());

        if(Number.isNaN(userId)) return c.json({erro: `ID Inválido`}, 400);

        const response = await workoutService.getWorkoutByUserId(userId);

        return c.json(response);

    }

};

export default workoutController;