import userService from "./userService";
import { Context } from "hono";

const userController = {

    async updateGoal(c: Context) {

        const userId = Number(c.get("userId"));

        if(Number.isNaN(userId)) return c.json({error: `ID Inválido`}, 400);

        const goalData = await c.req.json();
        
        try{    
            await userService.updateGoal(userId, goalData);
        
            return c.json({message: "Objetivo atualizado com sucesso."}); 

        } catch (error) {
            return c.json({error: "Erro ao atualizar objetivo."}, 500);
        }
    }

}

export default userController;