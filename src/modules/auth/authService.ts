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
            const params = new URLSearchParams({
                client_id: process.env.CLIENT_ID || "",
                client_secret: process.env.CLIENT_SECRET || "",
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
            
            let tokenData: StravaTokenResponse;
            if (parseResult.success) {
                tokenData = parseResult.data;
            } else {
                log.warn({ error: parseResult.error.message }, "Token response não passou validação Zod");
                tokenData = rawData as StravaTokenResponse;
            }

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