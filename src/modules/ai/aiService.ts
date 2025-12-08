import Groq from "groq-sdk";

const groq = new Groq({apiKey: process.env.GROQ_API_KEY});

const aiService = {

    async generateWorkoutPlan(){

        return groq.chat.completions.create({
            messages: [{
                role: "user",
                content: `Gere um plano de treino semanal para um atleta amador que deseja melhorar seu condicionamento físico geral. O plano deve incluir 5 dias de treino, com detalhes sobre o tipo de exercício, duração e intensidade. Considere que o atleta tem 30 anos, pesa 70kg e tem um nível intermediário de condicionamento físico.` 
            },],
            model: "llama-3.3-70b-versatile",
        });

    },

};

export default aiService;