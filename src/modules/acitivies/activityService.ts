import userRepository from "../users/userRepository"

const activityService = {

    async getActivies (userId: number) {

        const user = await userRepository.getUserById(userId);

        if(!user) throw new Error("Usuário não encontrado");

        const url: string = `https://www.strava.com/api/v3/athlete/activities?per_page=15`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization" : `Bearer ${user.accessToken}`
            }
        });

        if(!response.ok) throw new Error(`Error ao consultar atividades do atleta: ${response.statusText}`);

        const activies = await response.json();

        return activies;

    }

}

export default activityService;