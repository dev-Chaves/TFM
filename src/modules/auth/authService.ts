import { 
    AuthResponse, 
    StravaTokenResponse, 
    StravaTokenResponseSchema,
    StravaAthleteResponse 
} from "./authDto";
import userRepository from "../users/userRepository";
import userService from "../users/userService";
import { createLogger } from "../../shared/utils/logger";

const log = createLogger("AuthService");

const authService = {

    /**
     * Renova o access_token do Strava usando o refresh_token
     */
    async refreshStravaToken(userId: number, refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
        const clientId = process.env.CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error("CLIENT_ID and CLIENT_SECRET are required");
        }

        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token"
        });

        const response = await fetch(`https://www.strava.com/oauth/token?${params.toString()}`, {
            method: "POST"
        });

        if (!response.ok) {
            const errorText = await response.text();
            log.error({ status: response.status, body: errorText }, "Erro ao renovar token do Strava");
            throw new Error(`Erro ao renovar token: ${response.status}`);
        }

        const rawData: unknown = await response.json();
        const parseResult = StravaTokenResponseSchema.safeParse(rawData);

        if (!parseResult.success) {
            log.error({ error: parseResult.error.message }, "Resposta inválida ao renovar token");
            throw new Error("Resposta inválida do Strava ao renovar token");
        }

        const { access_token, refresh_token, expires_at } = parseResult.data;

        // Atualiza no banco
        await userRepository.updateStravaTokens(
            userId,
            access_token,
            refresh_token,
            new Date(expires_at * 1000)
        );

        log.info({ userId }, "Token do Strava renovado com sucesso");

        return { access_token, refresh_token, expires_at };
    },

    /**
     * Troca o código de autorização do Strava por tokens de acesso
     * e cria/atualiza o usuário no banco de dados
     */
    async exchangeCodeForToken(code: string): Promise<AuthResponse> {

        if(!code) {
            log.warn("Tentativa de autenticação sem código");
            throw new Error("Código inválido.");
        }

        log.info("Iniciando troca de código por token");

        try {
            const clientId = process.env.CLIENT_ID;
            const clientSecret = process.env.CLIENT_SECRET;
            if (!clientId || !clientSecret) {
                throw new Error("CLIENT_ID and CLIENT_SECRET are required");
            }

            const params = new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                grant_type: "authorization_code"
            });

            const tokenResponse = await fetch(`https://www.strava.com/oauth/token?${params.toString()}`, {
                method: "POST"
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                log.error({ status: tokenResponse.status, body: errorText }, "Erro na resposta do Strava (non-200)");
                throw new Error(`Erro na API do Strava: ${tokenResponse.status} - ${errorText}`);
            }

            let rawData: unknown;
            try {
                rawData = await tokenResponse.json();
            } catch (jsonError) {
                log.error({ error: jsonError }, "Falha ao fazer parse do JSON da resposta do Strava");
                throw new Error("Resposta inválida do Strava (não é JSON).");
            }

            // Verifica erros na resposta (caso o API retorne 200 OK mas com erro no corpo, embora raro para OAuth)
            if (typeof rawData === 'object' && rawData !== null && 'errors' in rawData) {
                log.error({ errors: rawData }, "Erro na resposta do Strava (campo errors presente)");
                throw new Error("Erro ao trocar o código pelo token.");
            }

            // Valida a resposta com Zod
            const parseResult = StravaTokenResponseSchema.safeParse(rawData);
            
            if (!parseResult.success) {
                log.error({ error: parseResult.error.message }, "Token response inválido do Strava");
                throw new Error("Resposta inválida do Strava");
            }
            const tokenData = parseResult.data;

            const { access_token, refresh_token, expires_at, athlete } = tokenData;

            log.info({ athleteId: athlete.id, athleteName: `${athlete.firstname} ${athlete.lastname}` }, "Atleta autenticado com sucesso");

            const user = await userRepository.saveUser(athlete, access_token, refresh_token, expires_at);

            const isFirstLogin: string = user.firstLogin ? "true" : "false";
            
            // Se é o primeiro login, marca no banco que não é mais primeiro login para a próxima vez
            if (user.firstLogin) {
                await userService.updateUserFirstLoginToFalse(user.id);
            }

            log.info({ userId: user.id, firstLogin: isFirstLogin }, "Usuário salvo/atualizado no banco");

            return {
                id: user.id,
                strava_id: user.stravaId ?? 0,
                strava_name: user.name,
                first_login: isFirstLogin
            };

        } catch (err) {
            log.error({ error: err instanceof Error ? err.message : err }, "Erro ao autenticar usuário");
            throw new Error("Erro ao autenticar usuário.");
        }
    }

}

export default authService;