import { ProjectFile, DocSection } from "./types";

export const INITIAL_FILES: ProjectFile[] = [
  {
    id: 'welcome',
    name: 'BEM_VINDO.md',
    path: 'BEM_VINDO.md',
    language: 'markdown',
    content: `# DevBuddyBot IDE

Bem-vindo ao seu ambiente de desenvolvimento integrado com IA.

### Você está conectado!
Agora você tem acesso aos seus repositórios públicos e privados.

### Como usar:
1. No painel esquerdo "Meus Repositórios", selecione um projeto.
2. O Agente carregará a estrutura e estará pronto para ajudar.
3. Clique nos arquivos para editar.

### Dica:
O Agente (Gemini) lê o contexto de todos os arquivos que você abre. Para uma refatoração completa, abra os arquivos relevantes antes de pedir ajuda.`
  }
];

export const APP_DOCS: DocSection[] = [
  {
    id: 'overview',
    title: 'Visão Geral',
    icon: 'Info',
    content: `# Visão Geral do DevBuddyBot

O DevBuddyBot é uma Web IDE (Ambiente de Desenvolvimento Integrado na Web) focada em "Pair Programming" com Inteligência Artificial. Diferente de chats comuns, ela possui contexto profundo sobre a estrutura de arquivos e o código sendo editado.

## Arquitetura Técnica
- **Frontend:** React 19, TailwindCSS, Lucide Icons.
- **Editor:** Monaco Editor (o mesmo core do VS Code).
- **IA:** Google Gemini 1.5 Pro (via @google/genai SDK).
- **Integração Git:** GitHub REST API (v3) com suporte a autenticação via Personal Access Token.
`
  },
  {
    id: 'auth',
    title: 'Guia de Autenticação',
    icon: 'Key',
    content: `# Guia de Autenticação

## Por que preciso de um Token?
Como esta é uma aplicação Web pura (sem backend), precisamos de um **Personal Access Token (PAT)** para falar diretamente com a API do GitHub em seu nome. Isso permite:
1. Listar seus repositórios privados.
2. Ler conteúdo de arquivos (raw) sem bloqueios de CORS.
3. Aumentar o limite de requisições por hora.

## Segurança
- O Token é salvo apenas no **localStorage** do seu navegador.
- Ele nunca é enviado para nenhum servidor além da API oficial do GitHub (\`https://api.github.com\`).
`
  },
  {
    id: 'features',
    title: 'Funcionalidades',
    icon: 'Code',
    content: `# Funcionalidades Principais

### 1. Agente de IA (Gemini)
- **Persona Dinâmica:** O agente muda sua personalidade técnica (ex: Staff Engineer, Frontend Specialist) baseada na linguagem do arquivo em foco.
- **Contexto Híbrido:** Recebe a árvore de arquivos completa do repositório para entender a estrutura, e o conteúdo completo apenas dos arquivos abertos.

### 2. Integração Git
- **Explorador de Repositórios:** Listagem automática dos repositórios do usuário.
- **Busca Global:** Capacidade de abrir repositórios públicos externos (ex: \`facebook/react\`) pela barra de busca.

### 3. Editor
- Baseado no Monaco Editor.
- Suporte a Syntax Highlighting para mais de 50 linguagens.
- Sistema de abas para múltiplos arquivos.
`
  }
];

export const SYSTEM_INSTRUCTION = `
Você é o DevBuddyBot, um engenheiro de software sênior.
Atue analisando o projeto inteiro fornecido no contexto.
`;

export const GEMINI_MODEL = 'gemini-3-pro-preview';