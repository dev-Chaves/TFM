import { Context } from "hono";
import userService from "./authService";
import activityService from "../acitivies/activityService";
import { sign } from "hono/jwt";

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

            const payload = {
                sub: response.id,
                name: response.strava_name,
                exp: Math.floor(Date.now() / 100) + 60 * 60 * 24 * 7,
            };

            const token = await sign(payload, process.env.JWT_SECRET!);

            return c.redirect("/auth/callback?userId={userId}&firstLogin=true");

            //redirect("/auth/callback?userId={userId}&firstLogin=true")

        } catch (err) {
            console.error(err);
            return c.redirect("https://gotfm.site/?error=server_error");
        }

    }
}

export default authController;;

