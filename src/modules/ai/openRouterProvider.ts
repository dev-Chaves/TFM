import OpenAI from 'openai';
import { AIProvider, AICompletionOptions } from './aiProvider.interface';
const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "https://tfm.app",
        "X-Title": "TFM - Training Flow Manager",
    },
});
export const openRouterProvider: AIProvider = {
    name: "OpenRouter/DeepSeek-R1",
    
    async complete(options: AICompletionOptions): Promise<string> {
        const completion = await client.chat.completions.create({
            model: "deepseek/deepseek-r1-0528:free",
            messages: options.messages,
            ...(options.jsonMode && { response_format: { type: "json_object" } })
        });
        
        const content = completion.choices[0].message.content;
        if (!content) throw new Error("OpenRouter: resposta vazia");
        return content;
    }
};