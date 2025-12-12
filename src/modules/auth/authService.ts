import { authResponse } from "./authDto";
import userRepository from "../users/userRepository";
import userService from "../users/userService";

const authService = {

    async exchangeCodeForToken (code: string): Promise<authResponse> {

    if(!code) throw new Error("Código inválido.");

    try {
        const tokenResponse = await fetch(`https://www.strava.com/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code: code,
                grant_type: "authorization_code"
            }),
        });

        const data = await tokenResponse.json();

        if(data.errors) throw new Error("Erro ao trocar o código pelo token.");

        const { access_token, refresh_token, expires_at, athlete } = data;

        const user = await userRepository.saveUser(athlete, access_token, refresh_token, expires_at);

        const isFirstLogin = user.firstLogin ? "true" : await userService.updateUserFirstLoginToFalse(user.id) ; 

        return {
            id: user.id,
            strava_id: user.stravaId ?? 0,
            strava_name: user.name,
            first_login: isFirstLogin
        };

    }catch (err) {

        console.error(err);

        throw new Error("Erro ao autenticar usuário.");
    }
}

}



export default authService;