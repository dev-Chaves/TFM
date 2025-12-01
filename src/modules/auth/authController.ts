import { Context } from "hono";
import userService from "./authService";
import activityService from "../acitivies/activityService";

const authController = {
    async  exchangeTokenHandler(c: Context) {

        const code = c.req.query("code");

        const error = c.req.query("error");

        if(error || !code ) {
            return c.json({
                error: "Usuário negou o acesso ou código inválido."
            },400);
        }

        let tokenResponse: Response;

        try{
            
            const response = await userService.exchangeCodeForToken(code)

            activityService.syncActivies(response.id).catch((error) => console.error("Erro no Sync:", error));

            return c.json({
                message: "Autenticado com sucesso!",
                userId: response.id,
                strave_name: response.strava_name,
                strava_id: response.strava_id
            }, 200);
        }catch (err) {

            console.error(err);

            return c.json({
                error: "Erro interno no servidor."
            },500);
        }

    }
}

export default authController;;

