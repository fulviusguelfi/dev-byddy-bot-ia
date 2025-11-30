import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  return (
    <div className="h-full w-full overflow-y-auto bg-[#1e1e1e] p-8 text-gray-300">
      <div className="max-w-4xl mx-auto prose prose-invert prose-pre:bg-[#111] prose-pre:border prose-pre:border-gray-800">
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
                  customStyle={{ background: '#0d0d0d', borderRadius: '0.5rem', margin: '1em 0' }}
                />
              ) : (
                <code {...props} className="bg-gray-800 rounded px-1 py-0.5 text-orange-200 font-mono text-sm">
                  {children}
                </code>
              )
            },
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-white border-b border-gray-700 pb-2 mb-6 mt-8" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-white mt-8 mb-4" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-medium text-white mt-6 mb-3" {...props} />,
            p: ({node, ...props}) => <p className="leading-7 mb-4 text-gray-300" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
            li: ({node, ...props}) => <li className="pl-1" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-ide-accent pl-4 italic text-gray-400 my-4 bg-[#252526] py-2 pr-2 rounded-r" {...props} />,
            hr: ({node, ...props}) => <hr className="border-gray-700 my-8" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownPreview;