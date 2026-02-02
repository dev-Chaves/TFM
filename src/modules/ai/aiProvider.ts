import { AIProvider, AICompletionOptions } from './aiProvider.interface';
import { openRouterProvider } from './openRouterProvider';
import { groqProvider } from './groqProvider';
import { createLogger } from '../../shared/utils/logger';
const log = createLogger("AIProvider");
// Ordem de prioridade dos provedores
const providers: AIProvider[] = [
    openRouterProvider,
    groqProvider
];
export async function generateCompletion(options: AICompletionOptions): Promise<string> {
    let lastError: Error | null = null;
    
    for (const provider of providers) {
        try {
            log.info({ provider: provider.name }, "Tentando gerar completion");
            const result = await provider.complete(options);
            log.info({ provider: provider.name }, "Completion gerada com sucesso");
            return result;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            log.warn({ provider: provider.name, error: lastError.message }, "Provider falhou, tentando próximo");
        }
    }
    
    throw new Error(`Todos os provedores falharam. Último erro: ${lastError?.message}`);
}