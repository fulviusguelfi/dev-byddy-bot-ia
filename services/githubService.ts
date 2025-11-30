import { GitTreeItem, GitHubRepo, GitHubUser } from "../types";

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Helper to get headers with Auth
 */
function getHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };
}

/**
 * Validates the token and returns the user profile
 */
export async function validateToken(token: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: getHeaders(token)
  });

  if (!response.ok) {
    throw new Error('Token inválido ou expirado.');
  }

  return await response.json();
}

/**
 * Fetches repositories for the logged-in user
 */
export async function getUserRepos(token: string): Promise<GitHubRepo[]> {
  // Fetch up to 100 recently updated repos
  const response = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`, {
    headers: getHeaders(token)
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar repositórios.');
  }

  return await response.json();
}

/**
 * Fetches the recursive file tree of a repository.
 */
export async function fetchRepoTree(owner: string, repo: string, token: string, branch?: string): Promise<GitTreeItem[]> {
  
  // If branch is not provided, we should ideally get the default branch from repo details, 
  // but for now we default to main/master fallback logic or let the API handle the default.
  // Using the trees URL directly requires a SHA or branch name.
  
  // 1. Get the default branch SHA if not provided
  let targetRef = branch || 'main';
  
  // First try to get the ref to ensure it exists (and handle main/master rename)
  if (!branch) {
      try {
          const repoDataRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
             headers: getHeaders(token)
          });
          const repoData = await repoDataRes.json();
          targetRef = repoData.default_branch;
      } catch (e) {
          // fallback
      }
  }

  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${targetRef}?recursive=1`, {
    headers: getHeaders(token)
  });

  if (!response.ok) {
    throw new Error('Não foi possível carregar a árvore de arquivos.');
  }

  const data = await response.json();
  
  if (data.truncated) {
    console.warn("Árvore de arquivos truncada pelo GitHub (muito grande).");
  }

  // Filter out non-text files
  return (data.tree as GitTreeItem[])
    .filter(item => item.type === 'blob') 
    .filter(item => !isBinary(item.path));
}

/**
 * Fetches the raw content of a specific file.
 * Uses the API with specific media type header to support Private Repos.
 */
export async function fetchFileContent(owner: string, repo: string, path: string, token: string): Promise<string> {
  // We use the contents API with the "raw" media type. 
  // This is better than raw.githubusercontent.com for private repos + CORS.
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  
  const response = await fetch(url, {
    headers: {
      ...getHeaders(token),
      'Accept': 'application/vnd.github.v3.raw' // Crucial for getting raw content directly
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao carregar conteúdo do arquivo.');
  }

  return await response.text();
}

function isBinary(path: string): boolean {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mov'];
  return extensions.some(ext => path.toLowerCase().endsWith(ext));
}

export function detectLanguage(filename: string): string {
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.go')) return 'go';
  if (filename.endsWith('.rs')) return 'rust';
  if (filename.endsWith('.java')) return 'java';
  if (filename.endsWith('.md')) return 'markdown';
  return 'plaintext';
}