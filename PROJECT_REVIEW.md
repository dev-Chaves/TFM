# Avaliação Técnica e de Produto - Projeto TFM

Este documento apresenta uma revisão crítica do projeto, focada na evolução para um MVP (Minimum Viable Product) robusto e na melhoria da qualidade do código, sob a perspectiva de engenharia de software e visão de produto.

---

## 1. Features Faltantes para o MVP
Para um produto de fitness que visa retenção e utilidade real, o fluxo atual apresenta lacunas críticas que podem frustrar os usuários iniciais.

### A. O Problema da "Corrida Dupla" (Vínculo 1:1)
*   **Cenário:** O usuário realiza duas atividades no mesmo dia (ex: um treino de manhã e uma caminhada à tarde).
*   **Comportamento Atual:** O sistema vincula a primeira atividade ao treino. Se uma segunda for sincronizada, ela pode não ser computada ou o sistema não saberá lidar com o vínculo múltiplo (atualmente a relação em `workouts` é `completedActivityId`).
*   **Recomendação:** 
    *   Implementar lógica de "Melhor Match": Vincular automaticamente a atividade que mais se aproxima da distância/tipo planejado.
    *   Permitir que o usuário alterne manualmente qual atividade deve ser vinculada ao treino do dia.

### B. Gestão de Fuso Horário (Timezone)
*   **Problema:** A comparação de datas atual é feita via strings `YYYY-MM-DD`. Atividades realizadas à noite (ex: 22h no Brasil) podem ser registradas como o dia seguinte em UTC no Strava, impedindo o vínculo automático com o treino correto.
*   **Recomendação:** Armazenar `scheduleDate` com timezone ou realizar a normalização para o fuso horário local do usuário antes da comparação no `activityService`.

### C. Gestão de "Atividades Extras"
*   **Problema:** Atividades que não possuem um treino planejado (ex: uma pelada no final de semana) são salvas no banco, mas não aparecem no Dashboard.
*   **Recomendação:** Criar uma seção de "Atividades Extras" ou "Fluxo Livre" no Dashboard para que o usuário veja seu volume total real, não apenas o planejado.

---

## 2. Melhorias no Código (Performance e Manutenção)

### A. Eficiência na Sincronização
*   **Ponto Crítico:** No `activityService.ts`, a função `syncActivities` busca **todos** os treinos do usuário para tentar encontrar um match.
*   **Impacto:** Conforme o histórico cresce, a performance degrada (O(n) crescente a cada sync).
*   **Melhoria:** Filtrar a busca de treinos no banco de dados para trazer apenas os treinos dentro do range de datas das atividades que estão sendo sincronizadas.

### B. Tipagem Estrita (Eliminação do `any`)
*   **Ponto Crítico:** Uso excessivo de `any` em retornos de IA e dados do Strava.
*   **Melhoria:** Definir interfaces TypeScript para a resposta do Strava e para o objeto `structure` da tabela de workouts. Isso evita erros de "undefined" em tempo de execução.

### C. Separação de Preocupações (Presenters/Formatters)
*   **Ponto Crítico:** O `workoutService.ts` contém muita lógica de formatação de UI (cálculo de ritmo, concatenação de emojis, mensagens de status).
*   **Melhoria:** Mover essa lógica para uma camada de `Presenters` ou `Mappers`, mantendo o `Service` focado apenas em regras de negócio e persistência.

---

## 3. Pontos Faltantes e Pontos de Atenção

*   **Resiliência da IA (Retry Logic):** O feedback da IA é gerado de forma assíncrona ("fire-and-forget"). Se a API da Groq/OpenAI falhar, o treino fica sem feedback para sempre. É necessário um mecanismo de "Retry" ou uma flag no banco para identificar feedbacks pendentes.
*   **Logs e Observabilidade:** Substituir `console.error` por uma biblioteca de log estruturado (ex: `pino`). Isso é essencial para debugar falhas na produção, especialmente em webhooks.
*   **Testes de Integração:** A lógica de "Matching" (vincular atividade ao treino planejado) é o coração do app e deve ter testes automatizados para evitar que mudanças futuras quebrem o vínculo de treinos passados.

---

## 4. Revisão Geral do Projeto

### Pontos Fortes:
*   **Stack Moderna:** Bun + Hono + Drizzle + Postgres é uma escolha excelente para performance e produtividade.
*   **Modularidade:** A divisão por módulos (`activities`, `workouts`, `ai`) está bem definida e segue boas práticas de organização.
*   **UX de IA:** A ideia de um "Coach" que gera feedback baseado no JSON bruto do Strava é um diferencial competitivo forte.

### Veredito:
O projeto está em um estágio de **Protótipo Funcional Avançado**. Para atingir o nível de um MVP pronto para escala, o foco deve sair da "criação de novas rotas" e ir para a **"integridade e consistência dos dados"**, garantindo que o usuário nunca perca um registro por erro de fuso horário ou conflito de múltiplas atividades.
