export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface ProjectFile {
  id: string;
  name: string;
  language: string;
  content: string;
  path: string; // Caminho completo no repo
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export enum SidebarView {
  EXPLORER = 'EXPLORER',
  SEARCH = 'SEARCH',
  GIT = 'GIT',
  SETTINGS = 'SETTINGS',
  HELP = 'HELP'
}

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: string;
}

// GitHub API Types
export interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name?: string;
  bio?: string;
  company?: string;
  location?: string;
  followers?: number;
  public_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  default_branch: string;
  updated_at: string;
  owner: GitHubUser;
}

export interface RepoContext {
  owner: string;
  repo: string;
  branch: string;
  tree: GitTreeItem[];
}