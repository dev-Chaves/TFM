import { userResponse } from "../dto/UserDTOs";
import userRepository from "../repository/userRepository";

const userService = {

    async exchangeCodeForToken  (code: string): Promise<userResponse> {

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

        const { acess_token, refresh_token, expirest_at, athlete } = data;

        const user = await userRepository.saveUser(athlete, acess_token, refresh_token, expirest_at);

        return {
            id: user.id,
            strava_name: user.name
        };

    }catch (err) {

        console.error(err);

        throw new Error("Erro ao autenticar usuário.");
    }
}

}



export default userService ;