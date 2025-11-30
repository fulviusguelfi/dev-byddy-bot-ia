import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, ProjectFile, GitTreeItem } from '../types';
import { streamGeminiResponse } from '../services/geminiService';
import { Icons } from './Icon';

interface ChatInterfaceProps {
  currentFile: ProjectFile;
  files: ProjectFile[];
  repoTree: GitTreeItem[]; // Nova prop
  repoName: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentFile, files, repoTree, repoName }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `Olá! Conectado ao repositório ${repoName || 'Local'}. Vejo a estrutura de arquivos. Abra os arquivos que deseja que eu analise profundamente.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Reset chat when repo changes
  useEffect(() => {
     if (repoName) {
        setMessages([{
            id: 'welcome-repo',
            role: 'model',
            content: `Ambiente reconfigurado para ${repoName}. Estou pronto para ajudar com o código.`,
            timestamp: new Date()
        }])
     }
  }, [repoName]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const modelMsgId = (Date.now() + 1).toString();
      let fullResponseText = "";
      
      setMessages(prev => [
        ...prev,
        {
          id: modelMsgId,
          role: 'model',
          content: '', 
          timestamp: new Date()
        }
      ]);

      const stream = streamGeminiResponse(
        messages, 
        userMsg.content,
        currentFile,
        files,
        repoTree
      );

      for await (const chunk of stream) {
        fullResponseText += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === modelMsgId 
              ? { ...msg, content: fullResponseText }
              : msg
          )
        );
      }

    } catch (error) {
      console.error("Failed to send message", error);
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          content: "Erro de conexão com o Agente. Tente novamente.",
          timestamp: new Date()
      }])
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-full bg-ide-bg text-gray-300 border-l border-ide-border">
      {/* Header */}
      <div className="h-9 border-b border-ide-border flex items-center justify-between px-4 bg-ide-activity">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Icons.Cpu size={14} className="text-ide-accent" /> 
          Senior Context <span className="text-gray-600">|</span> 
          <span className="text-gray-500 lowercase truncate max-w-[150px]" title={repoName}>
             {repoName ? repoName : 'Local Playground'}
          </span>
        </span>
        <button 
          onClick={handleClearChat}
          className="text-gray-400 hover:text-white transition-colors"
          title="Limpar chat"
        >
          <Icons.Eraser size={14} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                msg.role === 'user' ? 'bg-ide-accent text-white' : 'bg-purple-600 text-white'
              }`}>
                {msg.role === 'user' ? 'VC' : 'AI'}
              </div>
              <span className="text-xs text-gray-500">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className={`max-w-[90%] rounded-lg p-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-ide-activity text-white border border-ide-border' 
                : 'bg-transparent text-gray-300'
            }`}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown
                  components={{
                    code({node, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ background: '#111', borderRadius: '0.5rem', fontSize: '0.8rem' }}
                        />
                      ) : (
                        <code {...props} className="bg-gray-800 rounded px-1 py-0.5 text-orange-300 font-mono text-xs">
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm ml-2">
            <Icons.Loader className="animate-spin" size={14} />
            <span>Analisando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-ide-border bg-ide-activity">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-[#1e1e1e] border border-ide-border text-white text-sm rounded-md pl-4 pr-10 py-3 focus:outline-none focus:border-ide-accent focus:ring-1 focus:ring-ide-accent transition-all placeholder-gray-600"
            placeholder={`Pergunte sobre ${repoName || 'o código'}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button 
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
              !input.trim() || isLoading ? 'text-gray-600 cursor-not-allowed' : 'text-ide-accent hover:bg-[#2d2d2d]'
            }`}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Icons.Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;