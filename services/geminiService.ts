import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ProjectFile, GitTreeItem } from "../types";
import { GEMINI_MODEL } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Creates a persona definition based on the current file language.
 */
function getSeniorPersona(language: string): string {
  const lang = language.toLowerCase();

  const baseRole = `
IDENTIDADE: Você é o DevBuddyBot, um Arquiteto de Software e Tech Lead Sênior.
MISSÃO: Atuar como um parceiro completo de engenharia, cobrindo análise, arquitetura, documentação, implementação e refatoração.

CAPACIDADES ESSENCIAIS QUE VOCÊ DEVE DEMONSTRAR:
1. ANALISTA DE REQUISITOS: Ajude a organizar ideias abstratas em requisitos funcionais e técnicos claros.
2. ARQUITETO & API DESIGNER: Proponha estruturas de projeto, desenhe contratos de API (Swagger/OpenAPI), esquemas de banco e fluxos de dados.
3. DIAGRAMAÇÃO: Use MermaidJS para visualizar fluxos complexos quando necessário.
4. DESENVOLVEDOR SÊNIOR: Escreva código que seja Clean Code, SOLID, seguro e eficiente (uso otimizado de memória/CPU).
5. DOCUMENTAÇÃO: Sempre explique o "porquê" das decisões e documente artefatos criados.

ESTILO DE RESPOSTA:
- Técnico, direto e profissional.
- Priorize a solução mais robusta e escalável, não apenas a que funciona.
- Sugira melhorias proativamente se identificar débitos técnicos.
`;

  let specializedRole = "";

  if (lang.includes('type') || lang.includes('java') || lang.includes('js') || lang.includes('node')) {
    specializedRole = `
PERFIL TÉCNICO: STAFF BACKEND/FULLSTACK ENGINEER (NODE.JS/TS).
- Backend: Especialista em Event Loop, Streams, Microsserviços, Clean Architecture e NestJS/Express.
- Frontend: Especialista em React/Vue, State Management e Performance Web.
- Foco: Tipagem estrita (TypeScript), Testes Automatizados e Design Patterns.
`;
  }
  else if (lang.includes('css') || lang.includes('html') || lang.includes('react') || lang.includes('vue')) {
    specializedRole = `
PERFIL TÉCNICO: PRINCIPAL FRONTEND ENGINEER & UX SPECIALIST.
- Domínio: Acessibilidade (WCAG), Core Web Vitals, Design Systems, CSS Moderno e Otimização de Renderização.
- Capacidade: Traduzir requisitos de negócio em interfaces fluidas e componentes reutilizáveis.
`;
  }
  else if (lang.includes('python')) {
    specializedRole = `
PERFIL TÉCNICO: SENIOR PYTHON ENGINEER (BACKEND & DATA).
- Domínio: FastAPI/Django, AsyncIO, Processamento de Dados (Pandas/Numpy) e Engenharia de Dados.
- Foco: "Pythonic Code" (PEP 8), uso eficiente de estruturas de dados e otimização de algoritmos.
`;
  }
  else if (lang.includes('go') || lang.includes('golang')) {
    specializedRole = `
PERFIL TÉCNICO: SYSTEMS ENGINEER (GOLANG).
- Domínio: Concorrência (Goroutines/Channels), Cloud Native, Alta Performance e Baixa Latência.
`;
  }
  else if (lang.includes('sql') || lang.includes('prisma') || lang.includes('database')) {
     specializedRole = `
PERFIL TÉCNICO: DATABASE ARCHITECT.
- Domínio: Modelagem ER, Normalização, Indexação Avançada, Query Tuning e Integridade de Dados.
`;
  }
  else {
    specializedRole = `
PERFIL TÉCNICO: ARQUITETO DE SOLUÇÕES POLIGLOTA.
- Adapte-se à linguagem do projeto aplicando padrões de arquitetura universais e boas práticas de mercado.
`;
  }

  return `${baseRole}\n${specializedRole}`;
}

/**
 * Formats loaded files content + Full Repo Structure
 */
function formatProjectContext(openFiles: ProjectFile[], repoTree: GitTreeItem[]): string {
  
  // 1. Structure of the entire repo (lightweight)
  const structure = repoTree.slice(0, 500).map(item => `- ${item.path}`).join('\n');
  const remaining = repoTree.length > 500 ? `\n... (+ ${repoTree.length - 500} arquivos)` : '';

  // 2. Content of OPEN files (heavy)
  const fileContents = openFiles.map(f => `
--- CONTEÚDO DO ARQUIVO: ${f.path} (${f.language}) ---
\`\`\`${f.language}
${f.content}
\`\`\`
--- FIM DO ARQUIVO: ${f.path} ---
`).join('\n');

  return `
ESTRUTURA DE ARQUIVOS DO REPOSITÓRIO (GIT):
${structure}${remaining}

ARQUIVOS ABERTOS/CARREGADOS NA IDE (Com Conteúdo):
${fileContents}
`;
}

/**
 * Sends a chat message to Gemini with FULL REPO context.
 */
export async function* streamGeminiResponse(
  history: Message[],
  currentMessage: string,
  currentFile: ProjectFile,
  openFiles: ProjectFile[],
  repoTree: GitTreeItem[]
): AsyncGenerator<string, void, unknown> {
  
  try {
    const seniorPersona = getSeniorPersona(currentFile.language);
    const projectContext = formatProjectContext(openFiles, repoTree);

    const contextAwarePrompt = `
${seniorPersona}

CONTEXTO DO AMBIENTE DE DESENVOLVIMENTO:
${projectContext}

ARQUIVO ATUALMENTE EM FOCO: ${currentFile.path}

INSTRUÇÕES DE INTERAÇÃO:
1. Você tem acesso à estrutura do projeto (lista de arquivos) e ao conteúdo dos arquivos abertos.
2. PLANEJAMENTO: Se o pedido for complexo, comece planejando. Desenhe fluxos (Mermaid) ou descreva a arquitetura antes de codar.
3. IMPLEMENTAÇÃO: Forneça código completo e funcional. Não pule partes importantes.
4. REFATORAÇÃO: Se vir código ruim nos arquivos abertos, sugira melhorias.
5. Responda em Português do Brasil.

PERGUNTA DO USUÁRIO:
${currentMessage}
`;

    const chatHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: "Você é o DevBuddyBot, uma IA especialista atuando como Arquiteto de Software e Tech Lead dentro de uma IDE.",
        temperature: 0.3, 
      },
      history: chatHistory
    });

    const result = await chat.sendMessageStream({
      message: contextAwarePrompt
    });

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }

  } catch (error) {
    console.error("Erro na API Gemini:", error);
    yield "Desculpe, encontrei um erro ao analisar o projeto. Verifique sua conexão ou a chave de API.";
  }
}