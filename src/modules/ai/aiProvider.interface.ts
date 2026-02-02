export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AICompletionOptions {
    messages: ChatMessage[];
    jsonMode?: boolean;  // Se a resposta deve ser JSON
}

export interface AIProvider {
    name: string;
    complete(options: AICompletionOptions): Promise<string>;
}