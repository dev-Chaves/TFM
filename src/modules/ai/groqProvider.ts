import Groq from "groq-sdk";
import { AIProvider, AICompletionOptions } from './aiProvider.interface';

const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY,
    timeout: 120000 // 120 seconds
});

export const groqProvider: AIProvider = {
    name: "Groq/Llama-3.3-70B",
    
    async complete(options: AICompletionOptions): Promise<string> {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: options.messages,
            max_tokens: 8192,
            ...(options.jsonMode && { response_format: { type: "json_object" } })
        });
        
        if (!completion.choices?.length) {
            throw new Error("Groq: resposta sem choices");
        }
        const content = completion.choices[0].message.content;
        if (!content) throw new Error("Groq: resposta vazia");
        return content;
    }
};
