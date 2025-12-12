import { Context } from "hono";
import userService from "./authService";
import activityService from "../acitivies/activityService";

const authController = {
    async  exchangeTokenHandler(c: Context) {

        const code = c.req.query("code");

        const error = c.req.query("error");

        if(error || !code ) {
            return c.redirect("https://gotfm.site/?error=auth_failed");
        }

        let tokenResponse: Response;

        try{
            
            const response = await userService.exchangeCodeForToken(code)

            activityService.syncActivies(response.id).catch((error) => console.error("Erro no Sync:", error));

            return c.redirect(`https://gotfm.site/dashboard?userId=${response.id}`);

        } catch (err) {
            console.error(err);
            return c.redirect("https://gotfm.site/?error=server_error");
        }

    }
}

export default authController;;

