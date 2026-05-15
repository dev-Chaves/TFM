import OpenAI from 'openai';
import { AIProvider, AICompletionOptions } from './aiProvider.interface';
const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 120000, // 120 seconds
    defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "https://tfm.app",
        "X-Title": "TFM - Training Flow Manager",
    },
});
export const openRouterProvider: AIProvider = {
    name: "OpenRouter/DeepSeek-R1",
    
    async complete(options: AICompletionOptions): Promise<string> {
        const completion = await client.chat.completions.create({
            model: "deepseek/deepseek-v4-flash:free",
            messages: options.messages,
            max_tokens: 8192,
            ...(options.jsonMode && { response_format: { type: "json_object" } })
        });
        
        if (!completion.choices?.length) {
            throw new Error("OpenRouter: resposta sem choices");
        }
        let content = completion.choices[0].message.content;
        if (!content) throw new Error("OpenRouter: resposta vazia");

        // DeepSeek R1 envolve o JSON em tags <｜end▁of▁thinking｜> quebram o parse
        content = content.replace(/^[\s\S]*?```json\s*|\s*```[\s\S]*$/g, "").trim();
        // Remove possíveis tags  do modelo de raciocínio caso venham sem code block
        content = content.replace(/^[\s\S]*?({)/, "$1");

        return content;
    }
};