import { Context } from "hono";
import userService from "../services/userService";

const userController = {
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

            return c.json({
                message: "Autenticado com sucesso!",
                userId: response.id,
                strave_name: response.strava_name
            }, 200);
        }catch (err) {

            console.error(err);

            return c.json({
                error: "Erro interno no servidor."
            },500);
        }

    }
}



export default userController;;

