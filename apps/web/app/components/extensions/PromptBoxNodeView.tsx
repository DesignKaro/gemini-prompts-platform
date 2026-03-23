import React from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { SiOpenai, SiGooglegemini, SiClaude, SiPerplexity, SiX } from 'react-icons/si';

const AVAILABLE_LLMS = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity', 'Grok'];

const ICONS: Record<string, React.ElementType> = {
  ChatGPT: SiOpenai,
  Gemini: SiGooglegemini,
  Claude: SiClaude,
  Perplexity: SiPerplexity,
  Grok: SiX,
};

export default function PromptBoxNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const selectedLlms = (node.attrs.selectedLlms || []) as string[];

  const toggleLlm = (llm: string) => {
    if (!editor.isEditable) return;

    if (selectedLlms.includes(llm)) {
      updateAttributes({ selectedLlms: selectedLlms.filter((l: string) => l !== llm) });
    } else {
      updateAttributes({ selectedLlms: [...selectedLlms, llm] });
    }
  };

  return (
    <NodeViewWrapper className="prompt-widget">
      <div className="prompt-widget-header" contentEditable={false}>
        <div className="prompt-widget-llms">
          {AVAILABLE_LLMS.map((llm) => {
            const Icon = ICONS[llm] as React.ElementType;
            return (
              <button
                key={llm}
                type="button"
                onClick={() => toggleLlm(llm)}
                className={`prompt-widget-llm prompt-widget-llm-${llm.toLowerCase()} ${
                  selectedLlms.includes(llm) ? 'is-active' : 'is-inactive'
                }`}
                title={editor.isEditable ? `Toggle ${llm} tag` : llm}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        <div className="prompt-widget-copy-btn" title="Copy button (functional on published post)">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <span className="prompt-widget-copy-text" style={{ marginLeft: '4px' }}>
            Copy
          </span>
        </div>
      </div>
      <NodeViewContent className="prompt-widget-content" />
    </NodeViewWrapper>
  );
}
