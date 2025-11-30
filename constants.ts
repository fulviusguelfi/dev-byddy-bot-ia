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
    content: `#