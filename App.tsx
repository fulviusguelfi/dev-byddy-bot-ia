import React, { useState, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import ChatInterface from './components/ChatInterface';
import MarkdownPreview from './components/MarkdownPreview';
import { INITIAL_FILES, APP_DOCS } from './constants';
import { Icons } from './components/Icon';
import { ProjectFile, SidebarView, GitTreeItem, GitHubUser, GitHubRepo, DocSection } from './types';
import { fetchRepoTree, fetchFileContent, detectLanguage, validateToken, getUserRepos } from './services/githubService';

const App: React.FC = () => {
  // Auth State
  const [githubToken, setGithubToken] = useState<string>('');
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState('');

  // IDE State
  const [files, setFiles] = useState<ProjectFile[]>(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState<string>(INITIAL_FILES[0].id);
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>(SidebarView.EXPLORER);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // View Mode State (Editor vs Preview)
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('preview'); // Default to preview for initial welcome file
  
  // Git Data State
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [repoFilter, setRepoFilter] = useState('');
  const [repoTree, setRepoTree] = useState<GitTreeItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [connectedRepo, setConnectedRepo] = useState<string>('');

  // Derived state for active file
  const activeFile = files.find(f => f.id === activeFileId) || (files.length > 0 ? files[0] : null);

  // Load token from local storage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('devbuddybot_gh_token');
    if (storedToken) {
      setTokenInput(storedToken);
      handleLogin(storedToken);
    }
  }, []);

  // Update view mode when switching files
  useEffect(() => {
    if (activeFile) {
      // Logic to auto-switch view mode based on context
      if (activeFile.path.startsWith('docs/')) {
        setViewMode('preview');
      } else if (activeFile.id === 'welcome' || activeFile.id === 'readme') {
        // Keep current preference or default to preview for docs? 
        // Let's default READMEs to preview if it's the first load, but generally respect user toggle.
        // For now, let's leave it as is, user can toggle.
      } else {
        setViewMode('editor');
      }
    }
  }, [activeFileId]);

  const handleLogin = async (tokenOverride?: string) => {
    const tokenToUse = tokenOverride || tokenInput;
    if (!tokenToUse) return;
    
    setAuthError('');
    setIsLoadingRepos(true);

    try {
      const userData = await validateToken(tokenToUse);
      setUser(userData);
      setGithubToken(tokenToUse);
      localStorage.setItem('devbuddybot_gh_token', tokenToUse);
      setIsLoginModalOpen(false);
      
      // Fetch repos
      const repos = await getUserRepos(tokenToUse);
      setUserRepos(repos);
    } catch (err) {
      setAuthError('Token inválido ou erro de conexão.');
      localStorage.removeItem('devbuddybot_gh_token');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleLogout = () => {
    setGithubToken('');
    setUser(null);
    setUserRepos([]);
    setRepoTree([]);
    setConnectedRepo('');
    localStorage.removeItem('devbuddybot_gh_token');
    setIsLoginModalOpen(true);
    setFiles(INITIAL_FILES);
  };

  const handleLoadRepo = async (repo: GitHubRepo) => {
    if (!githubToken) return;
    
    setIsLoadingTree(true);
    try {
      const tree = await fetchRepoTree(repo.owner.login, repo.name, githubToken, repo.default_branch);
      setRepoTree(tree);
      setConnectedRepo(repo.full_name);
      
      const welcomeFile: ProjectFile = {
        id: 'readme',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${repo.full_name}\n\nRepositório carregado no DevBuddyBot.\nBranch: ${repo.default_branch}\nPrivado: ${repo.private ? 'Sim' : 'Não'}`
      };
      setFiles([welcomeFile]);
      setActiveFileId('readme');
      setViewMode('preview'); // Default README to preview
      
    } catch (error) {
      alert("Erro ao carregar a árvore do repositório.");
      console.error(error);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const handleOpenPublicRepo = async (repoString: string) => {
    if (!githubToken) return;
    
    // Clean input (remove https://github.com/ if present)
    const cleanRepo = repoString.trim().replace('https://github.com/', '').replace(/\/$/, '');
    const parts = cleanRepo.split('/');
    
    if (parts.length < 2) return;
    const [owner, name] = parts;

    setIsLoadingTree(true);
    try {
      // fetchRepoTree will auto-detect default branch if not provided
      const tree = await fetchRepoTree(owner, name, githubToken);
      setRepoTree(tree);
      setConnectedRepo(`${owner}/${name}`);
      
      const welcomeFile: ProjectFile = {
        id: 'readme',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${owner}/${name}\n\nRepositório Público carregado.\n(Modo de acesso via busca pública)`
      };
      setFiles([welcomeFile]);
      setActiveFileId('readme');
      setViewMode('preview');
      setRepoFilter(''); // Clear filter
      
    } catch (error) {
      alert(`Erro ao carregar repositório "${cleanRepo}". Verifique se o nome está correto e se é público.`);
      console.error(error);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const handleFileClick = async (item: GitTreeItem) => {
    const existing = files.find(f => f.path === item.path);
    if (existing) {
      setActiveFileId(existing.id);
      return;
    }

    try {
      // Support nested paths for connectedRepo
      const [owner, repoName] = connectedRepo.split('/');
      const content = await fetchFileContent(owner, repoName, item.path, githubToken);
      
      const newFile: ProjectFile = {
        id: item.sha,
        name: item.path.split('/').pop() || item.path,
        path: item.path,
        language: detectLanguage(item.path),
        content: content
      };

      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
      // Determine default view mode based on extension
      setViewMode(newFile.language === 'markdown' ? 'preview' : 'editor');
    } catch (err) {
      console.error("Failed to load file", err);
    }
  };

  const handleOpenDoc = (doc: DocSection) => {
    const existing = files.find(f => f.id === `doc-${doc.id}`);
    if (existing) {
      setActiveFileId(existing.id);
      setViewMode('preview'); // Always preview docs
      return;
    }

    const newDocFile: ProjectFile = {
      id: `doc-${doc.id}`,
      name: `${doc.title}.md`,
      path: `docs/${doc.id}`,
      language: 'markdown',
      content: doc.content
    };

    setFiles(prev => [...prev, newDocFile]);
    setActiveFileId(newDocFile.id);
    setViewMode('preview'); // Always preview docs
  };

  const handleCloseFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);
    
    if (activeFileId === fileId) {
      if (newFiles.length > 0) {
        setActiveFileId(newFiles[newFiles.length - 1].id);
      } else {
        setActiveFileId('');
      }
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined && activeFileId) {
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: value } : f));
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <Icons.FileCode size={14} className="text-blue-400" />;
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <Icons.FileCode size={14} className="text-yellow-300" />;
    if (filename.endsWith('.css')) return <Icons.FileType size={14} className="text-blue-200" />;
    if (filename.endsWith('.json')) return <Icons.FileJson size={14} className="text-yellow-400" />;
    if (filename.endsWith('.md')) return <Icons.FileType size={14} className="text-gray-300" />;
    return <Icons.FileCode size={14} className="text-gray-400" />;
  };

  const filteredRepos = userRepos.filter(r => r.full_name.toLowerCase().includes(repoFilter.toLowerCase()));
  const showPublicRepoOption = repoFilter.includes('/') && repoFilter.split('/').length >= 2;

  // Dummy file for Chat when no file is open
  const dummyFile: ProjectFile = {
    id: 'none',
    name: 'Nenhum arquivo',
    path: '',
    language: 'plaintext',
    content: ''
  };

  if (!user && isLoginModalOpen) {
    return (
      <div className="flex h-screen w-screen bg-[#1e1e1e] items-center justify-center font-sans">
        <div className="bg-[#252526] p-8 rounded-lg shadow-2xl border border-[#3e3e42] max-w-md w-full">
           <div className="flex justify-center mb-6">
             <div className="bg-ide-accent p-3 rounded-full">
               <Icons.Github size={32} className="text-white" />
             </div>
           </div>
           <h2 className="text-2xl font-bold text-center text-white mb-2">DevBuddyBot</h2>
           <p className="text-gray-400 text-center mb-6 text-sm">
             Faça login com seu GitHub Personal Access Token para acessar seus repositórios privados e públicos.
           </p>

           <div className="space-y-4">
             <div>
               <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 block">
                 Personal Access Token (Classic)
               </label>
               <input 
                 type="password"
                 className="w-full bg-[#1e1e1e] border border-gray-600 rounded px-3 py-2 text-white focus:border-ide-accent focus:outline-none transition-colors"
                 placeholder="ghp_..."
                 value={tokenInput}
                 onChange={(e) => setTokenInput(e.target.value)}
               />
               {authError && <p className="text-red-400 text-xs mt-1">{authError}</p>}
             </div>
             
             <button 
               onClick={() => handleLogin()}
               disabled={isLoadingRepos || !tokenInput}
               className="w-full bg-ide-accent hover:bg-blue-600 text-white font-medium py-2 rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {isLoadingRepos ? <Icons.Loader className="animate-spin" size={18}/> : 'Conectar com GitHub'}
             </button>

             <a 
               href="https://github.com/settings/tokens/new?scopes=repo&description=DevBuddyBot%20Web%20IDE" 
               target="_blank" 
               rel="noreferrer"
               className="w-full bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white font-medium py-2 rounded transition-all flex items-center justify-center gap-2 text-sm"
             >
               <Icons.Key size={14} />
               Gerar Token no Navegador
             </a>

             <div className="text-xs text-gray-500 text-center mt-2">
               O token é salvo apenas no seu navegador.
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-ide-bg text-white overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-10 bg-[#3c3c3c] flex items-center px-4 justify-between select-none shadow-sm z-10 border-b border-[#2b2b2b]">
        <div className="flex items-center gap-3">
          <Icons.Terminal size={18} className="text-ide-accent" />
          <span className="text-sm font-bold text-gray-200 tracking-tight">DevBuddyBot</span>
          {connectedRepo && (
             <span className="text-xs bg-[#2d2d2d] px-2 py-0.5 rounded text-gray-300 border border-gray-600 flex items-center gap-1">
               <Icons.GitBranch size={10} /> {connectedRepo}
             </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
           <span>Gemini 1.5 Pro</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Activity Bar */}
        <div className="w-12 bg-ide-activity flex flex-col items-center py-2 gap-2 border-r border-ide-border z-20 justify-between relative">
          <div className="flex flex-col items-center gap-2 w-full">
            <button 
              onClick={() => setActiveSidebarView(SidebarView.EXPLORER)}
              className={`p-3 rounded-md transition-all relative ${activeSidebarView === SidebarView.EXPLORER ? 'text-white border-l-2 border-ide-accent bg-[#2a2d2e]' : 'text-gray-500 hover:text-white'}`}
              title="Explorador de Arquivos"
            >
              <Icons.GitBranch size={24} strokeWidth={1.5} />
            </button>
            <button 
              onClick={() => setActiveSidebarView(SidebarView.SEARCH)}
              className={`p-3 rounded-md transition-all ${activeSidebarView === SidebarView.SEARCH ? 'text-white border-l-2 border-ide-accent bg-[#2a2d2e]' : 'text-gray-500 hover:text-white'}`}
              title="Busca"
            >
              <Icons.Search size={24} strokeWidth={1.5} />
            </button>
            <button 
              onClick={() => setActiveSidebarView(SidebarView.HELP)}
              className={`p-3 rounded-md transition-all ${activeSidebarView === SidebarView.HELP ? 'text-white border-l-2 border-ide-accent bg-[#2a2d2e]' : 'text-gray-500 hover:text-white'}`}
              title="Ajuda e Documentação"
            >
              <Icons.HelpCircle size={24} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 mb-2 group relative">
            {user && (
              <>
                 <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border border-gray-600 cursor-help" />
                 
                 {/* Profile Popover */}
                 <div className="absolute left-10 bottom-0 mb-0 ml-2 w-64 bg-[#252526] border border-[#454545] rounded-lg shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="flex items-center gap-3 mb-3 border-b border-gray-700 pb-3">
                      <img src={user.avatar_url} className="w-12 h-12 rounded-full" />
                      <div>
                        <div className="font-bold text-white text-sm">{user.name || user.login}</div>
                        <div className="text-xs text-gray-400">@{user.login}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs text-gray-300">
                       {user.bio && <div className="italic text-gray-500 mb-2">{user.bio}</div>}
                       {user.company && <div className="flex items-center gap-2"><Icons.Briefcase size={12}/> {user.company}</div>}
                       {user.location && <div className="flex items-center gap-2"><Icons.MapPin size={12}/> {user.location}</div>}
                       <div className="flex items-center gap-2"><Icons.Users size={12}/> {user.followers} seguidores</div>
                       <div className="flex items-center gap-2"><Icons.FolderOpen size={12}/> {user.public_repos} repos públicos</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-700 flex flex-col gap-1">
                       <div className="flex items-center gap-2 text-[10px] text-green-400">
                          <Icons.ShieldCheck size={10} />
                          Token Válido & Seguro
                       </div>
                       <div className="flex items-center gap-2 text-[10px] text-blue-400">
                          <Icons.Link size={10} />
                          Conexão GitHub API (v3)
                       </div>
                    </div>
                 </div>
              </>
            )}
            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <Icons.LogOut size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 bg-[#252526] flex flex-col border-r border-ide-border">
          <div className="h-9 px-4 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-[#252526] shrink-0">
             {activeSidebarView === SidebarView.EXPLORER && 'Meus Repositórios'}
             {activeSidebarView === SidebarView.SEARCH && 'Busca'}
             {activeSidebarView === SidebarView.HELP && 'Ajuda'}
          </div>
          
          {activeSidebarView === SidebarView.EXPLORER && (
            <div className="flex-1 overflow-y-auto flex flex-col">
               {/* Repo Selection Mode */}
               {!connectedRepo ? (
                 <div className="flex flex-col h-full">
                   <div className="p-2 border-b border-ide-border">
                      <div className="relative">
                        <Icons.Search size={12} className="absolute left-2 top-2 text-gray-500"/>
                        <input 
                          className="w-full bg-[#3c3c3c] rounded text-xs text-white pl-7 pr-2 py-1 focus:outline-none border border-transparent focus:border-ide-accent placeholder-gray-500"
                          placeholder="Filtrar ou user/repo..."
                          value={repoFilter}
                          onChange={(e) => setRepoFilter(e.target.value)}
                        />
                      </div>
                   </div>
                   <div className="flex-1 overflow-y-auto">
                      {/* Option to open public repo directly */}
                      {showPublicRepoOption && (
                        <div 
                          onClick={() => handleOpenPublicRepo(repoFilter)}
                          className="px-3 py-3 cursor-pointer bg-[#2e3031] hover:bg-[#37373d] flex items-center gap-2 border-b border-ide-border group"
                        >
                           <div className="bg-ide-activity p-1.5 rounded text-green-400">
                             <Icons.Globe size={14} />
                           </div>
                           <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs text-white font-medium truncate">Abrir Público</span>
                              <span className="text-[10px] text-gray-400 truncate">{repoFilter}</span>
                           </div>
                           <Icons.ArrowRight size={12} className="text-gray-500 group-hover:text-white" />
                        </div>
                      )}

                      {filteredRepos.map(repo => (
                        <div 
                          key={repo.id}
                          onClick={() => handleLoadRepo(repo)}
                          className="px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] flex items-center gap-2 group border-l-2 border-transparent hover:border-ide-accent transition-all"
                        >
                           {repo.private ? <Icons.Lock size={12} className="text-yellow-500"/> : <Icons.GitBranch size={12} className="text-blue-400"/>}
                           <div className="flex flex-col min-w-0">
                             <span className="text-xs text-gray-300 truncate font-medium group-hover:text-white">{repo.name}</span>
                             <span className="text-[10px] text-gray-500 truncate">{repo.owner.login}</span>
                           </div>
                           {isLoadingTree && connectedRepo === repo.full_name && <Icons.Loader size={12} className="ml-auto animate-spin" />}
                        </div>
                      ))}
                      
                      {filteredRepos.length === 0 && !showPublicRepoOption && (
                        <div className="p-4 text-center">
                          <p className="text-xs text-gray-500 mb-2">Nenhum repositório encontrado.</p>
                          <p className="text-[10px] text-gray-600">Digite "usuario/repo" para abrir um repositório público.</p>
                        </div>
                      )}
                   </div>
                 </div>
               ) : (
                 // Connected - Show File Tree
                 <div className="flex flex-col h-full">
                    <div className="p-2 bg-[#2d2d2d] border-b border-ide-border flex items-center justify-between">
                       <span className="text-xs font-bold truncate text-white flex items-center gap-2" title={connectedRepo}>
                         <Icons.FolderOpen size={14} className="text-ide-accent min-w-[14px]"/> 
                         <span className="truncate">{connectedRepo}</span>
                       </span>
                       <button onClick={() => { setConnectedRepo(''); setRepoTree([]); setFiles(INITIAL_FILES); }} className="text-xs text-red-400 hover:text-red-300 whitespace-nowrap ml-2">Fechar</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-1">
                      {repoTree.map(item => (
                        <div 
                            key={item.path}
                            onClick={() => handleFileClick(item)}
                            className={`flex items-center gap-2 px-4 py-1 cursor-pointer text-xs transition-colors whitespace-nowrap overflow-hidden ${
                              activeFile && activeFile.path === item.path ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200'
                            }`}
                            style={{ paddingLeft: `${(item.path.split('/').length * 12) + 6}px` }}
                        >
                          {getFileIcon(item.path)}
                          <span className="truncate">{item.path.split('/').pop()}</span>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          )}
          
          {activeSidebarView === SidebarView.SEARCH && (
             <div className="p-4 text-center text-gray-500 text-xs mt-10">Busca global não disponível na versão web.</div>
          )}

          {activeSidebarView === SidebarView.HELP && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 space-y-1">
                {APP_DOCS.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => handleOpenDoc(doc)}
                    className="px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] rounded text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
                  >
                     <Icons.BookOpen size={14} className="text-ide-accent" />
                     <span className="text-xs font-medium">{doc.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Sidebar */}
        <div className={`${isSidebarOpen ? 'w-[450px]' : 'w-0'} transition-all duration-300 ease-in-out flex flex-col border-r border-ide-border bg-[#1e1e1e] shadow-xl z-20`}>
           <ChatInterface 
              currentFile={activeFile || dummyFile} 
              files={files} 
              repoTree={repoTree} 
              repoName={connectedRepo} 
            />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tabs */}
          <div className="h-9 bg-[#1e1e1e] flex items-center overflow-x-auto no-scrollbar border-b border-ide-border">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`
                  group px-3 py-2 text-xs flex items-center gap-2 border-r border-ide-border cursor-pointer min-w-[120px] max-w-[200px] select-none
                  ${activeFileId === file.id ? 'bg-[#1e1e1e] text-white border-t-2 border-t-ide-accent' : 'bg-[#2d2d2d] text-gray-500 border-t-2 border-t-transparent hover:bg-[#1e1e1e]'}
                `}
              >
                {getFileIcon(file.name)}
                <span className="truncate">{file.name}</span>
                <span 
                  onClick={(e) => handleCloseFile(e, file.id)}
                  className="ml-auto opacity-0 group-hover:opacity-100 hover:bg-gray-700 rounded p-1 text-gray-400 hover:text-white transition-all"
                >
                  <Icons.X size={12} />
                </span>
              </div>
            ))}
          </div>
          
          {activeFile ? (
            <>
              {/* Breadcrumbs and Controls */}
              <div className="h-8 flex items-center px-4 justify-between bg-[#1e1e1e] border-b border-ide-border/50">
                 <div className="flex items-center text-xs text-gray-500">
                    {connectedRepo || 'local'} <span className="mx-1">›</span> {activeFile.path || activeFile.name}
                 </div>
                 
                 {/* Markdown Toggle */}
                 {activeFile.language === 'markdown' && (
                    <div className="flex bg-[#2d2d2d] rounded p-0.5 border border-[#3e3e42]">
                       <button 
                         onClick={() => setViewMode('editor')}
                         className={`px-2 py-0.5 text-[10px] rounded transition-colors ${viewMode === 'editor' ? 'bg-ide-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}
                       >
                         Code
                       </button>
                       <button 
                         onClick={() => setViewMode('preview')}
                         className={`px-2 py-0.5 text-[10px] rounded transition-colors ${viewMode === 'preview' ? 'bg-ide-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}
                       >
                         Preview
                       </button>
                    </div>
                 )}
              </div>

              {/* Editor or Preview Instance */}
              <div className="flex-1 relative overflow-hidden">
                {activeFile.language === 'markdown' && viewMode === 'preview' ? (
                   <MarkdownPreview content={activeFile.content} />
                ) : (
                   <CodeEditor 
                    code={activeFile.content} 
                    onChange={handleCodeChange} 
                    language={activeFile.language} 
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-500 select-none">
               <Icons.Code size={48} className="mb-4 opacity-20" />
               <p className="text-sm font-medium">Nenhum arquivo aberto</p>
               <p className="text-xs text-gray-600 mt-2 max-w-xs text-center">Selecione um arquivo no menu lateral para visualizar ou editar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-ide-accent flex items-center px-3 justify-between text-[11px] text-white select-none z-30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Icons.GitBranch size={10}/> {connectedRepo ? 'connected' : 'no-repo'}</span>
          <span className="flex items-center gap-1"><Icons.User size={10}/> {user ? user.login : 'Guest'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="cursor-pointer hover:bg-white/20 px-1 rounded" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? 'Fechar Assistente' : 'Abrir Assistente'}
          </span>
          {activeFile && (
             <>
               <span className="uppercase">{activeFile.language}</span>
               <span>UTF-8</span>
             </>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;