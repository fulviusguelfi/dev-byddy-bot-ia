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
  
  if (lang.includes('type') || lang.includes('java') || lang.includes('js') || lang.includes('node')) {
    return `Você é um Engenheiro de Software Sênior / Staff Engineer especializado em TypeScript, JavaScript e ecossistema Node.js. 
    Você preza por: Tipagem estrita, SOLID, Clean Code, Design Patterns e Performance.`;
  }
  
  if (lang.includes('css') || lang.includes('html') || lang.includes('react')) {
    return `Você é um Desenvolvedor Front-end Sênior especialista em UI/UX e Design Systems.
    Você preza por: Acessibilidade (a11y), Performance de renderização, CSS Moderno e Componentização eficiente.`;
  }

  if (lang.includes('python')) {
    return `Você é um Pythonista Sênior especialista em Backend e Data Engineering.
    Você preza por: Pythonic Code (PEP 8), otimização de algoritmos e bibliotecas eficientes.`;
  }

  return `Você é um Engenheiro de Software Sênior Poliglota com vasta experiência em arquitetura de sistemas.
  Você preza por: Manutenibilidade, Escalabilidade e Segurança.`;
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

INSTRUÇÕES DE RESPOSTA:
1. Você tem acesso à LISTA DE ARQUIVOS do repositório, mas apenas ao CONTEÚDO dos arquivos listados em "ARQUIVOS ABERTOS".
2. Se a pergunta depender de um arquivo que não está aberto, diga ao usuário: "Por favor, abra o arquivo X para que eu possa analisá-lo detalhadamente", mas faça inferências baseadas no nome/caminho do arquivo.
3. Responda de forma técnica, direta e profissional.
4. Use Português do Brasil.

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
        systemInstruction: "Você é um assistente sênior em uma Web IDE conectada ao Git. Ajude o usuário a navegar e codar no repositório.",
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