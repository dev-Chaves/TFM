import { Context } from "hono";
import activityService from "../activities/activityService";
import { sign } from "hono/jwt";
import authService from "./authService";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("AuthController");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://gotfm.site";

/**
 * JWT Payload type compatible with hono/jwt
 */
interface JwtPayload {
    sub: number;
    name: string;
    exp: number;
    [key: string]: unknown;
}

const authController = {

    /**
     * Handler para trocar código OAuth do Strava por token JWT
     * Redireciona o usuário para o dashboard após autenticação
     */
    async exchangeTokenHandler(c: Context): Promise<Response> {

        const code = c.req.query("code");
        const error = c.req.query("error");

        if (error || !code) {
            log.warn({ error }, "Falha na autenticação OAuth");
            return c.redirect(`${FRONTEND_URL}/?error=auth_failed`);
        }

        try {
            const response = await authService.exchangeCodeForToken(code);

            log.info({ userId: response.id }, "Usuário autenticado com sucesso");

            // Fire-and-forget: sincroniza atividades em background
            activityService.syncActivities(response.id).catch((syncError: Error) => {
                log.error({ userId: response.id, error: syncError.message }, "Erro ao sincronizar atividades após login");
            });

            const payload: JwtPayload = {
                sub: response.id,
                name: response.strava_name,
                exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 dias
            };

            const token = await sign(payload, process.env.JWT_SECRET!);

            log.info({ userId: response.id, firstLogin: response.first_login }, "JWT gerado, redirecionando para dashboard");

            return c.redirect(`${FRONTEND_URL}/dashboard?token=${token}&firstLogin=${response.first_login}`);

        } catch (err) {
            log.error({ error: err instanceof Error ? err.message : err }, "Erro no fluxo de autenticação");
            return c.redirect(`${FRONTEND_URL}/?error=server_error`);
        }
    }
}

export default authController;