import aiService from "../ai/aiService";
import userRepository from "../users/userRepository"
import workoutRepository from "../workouts/workoutRepository";
import activityRepository from "./activityRepository";

const activityService = {

    async syncActivies (userId: number) {

        const user = await userRepository.getUserById(userId);

        if(!user) throw new Error("Usuário não encontrado");

        // Busca a última atividade sincronizada para evitar duplicatas
        const lastActivity = await activityRepository.getLastActivityByUserId(userId);
        
        let afterParam = "";
        if (lastActivity?.startDate) {
            // Strava usa timestamp Unix em segundos
            const timestamp = Math.floor(new Date(lastActivity.startDate).getTime() / 1000);
            afterParam = `&after=${timestamp}`;
        }

        const url: string = `https://www.strava.com/api/v3/athlete/activities?per_page=30${afterParam}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization" : `Bearer ${user.accessToken}`
            }
        });

        if(!response.ok) throw new Error(`Error ao consultar atividades do atleta: ${response.statusText}`);

        const data = await response.json();

        const saveActivies = await activityRepository.saveActivies(user.id, data);

        const workoutsNotCompleted = await workoutRepository.getWorkoutByUserId(userId);

        let matchesFound = 0;

        for (const activity of saveActivies) {

            const activityDate = activity.startDate ? new Date(activity.startDate).toISOString().split('T')[0] : null;

            if(!activityDate) continue;

            const match = workoutsNotCompleted.find(w => w.scheduleDate === activityDate);

            if(match) {

                await workoutRepository.linkActivityToWorkout(match.id, activity.id);
                
                matchesFound++;

                // Sem o await ela funcionara de forma assíncrona, não bloqueando o fluxo principal e respeitando o tempo de resposta da API
                // Fire-and-forget Pattern => fazemos que não esperamos o resultado dessa chamada para continuar
                aiService.generateWorkoutFeedback(
                    match.userId, 
                    match.id,
                    match.structure,
                    activity.rawData)
                .then(()=> {
                    console.log(`Feedback da IA salvo para o treino ID: ${match.id}`);
                }).catch((err) => {
                    console.error(`Erro ao gerar feedback da IA para o treino ID: ${match.id} - ${err.message}`);
                });

            }

        }

        console.log("User ID:", user.id, "Novas atividades:", data.length);

        return {
            message: `Sincronização realizada com sucesso`,
            new_activities_linked: matchesFound
        };

    },


}

export default activityService;