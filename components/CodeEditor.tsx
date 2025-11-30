import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language = "typescript" }) => {
  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={code}
        theme="vs-dark"
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 20, bottom: 20 },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
        }}
      />
    </div>
  );
};

export default CodeEditor;