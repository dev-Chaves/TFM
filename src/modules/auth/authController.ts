import { Context } from "hono";
import activityService from "../acitivies/activityService";
import { sign } from "hono/jwt";
import authService from "./authService";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gotfm.site";

const authController = {
    async exchangeTokenHandler(c: Context) {

        const code = c.req.query("code");
        const error = c.req.query("error");

        if (error || !code) {
            return c.redirect(`${FRONTEND_URL}/?error=auth_failed`);
        }

        try {
            const response = await authService.exchangeCodeForToken(code);

            activityService.syncActivies(response.id).catch((error) => console.error("Erro no Sync:", error));

            const payload = {
                sub: response.id,
                name: response.strava_name,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // CORRIGIDO: era /100, deve ser /1000
            };

            const token = await sign(payload, process.env.JWT_SECRET!);

            return c.redirect(`${FRONTEND_URL}/dashboard?token=${token}&fistLogin?=${response.first_login}`);

        } catch (err) {
            console.error(err);
            return c.redirect(`${FRONTEND_URL}/?error=server_error`);
        }
    }
}

export default authController;