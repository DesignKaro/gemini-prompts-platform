'use client';

import { usePathname } from 'next/navigation';
import { SiClaude, SiGooglegemini, SiOpenai, SiPerplexity, SiX } from 'react-icons/si';

const AI_TOOLS = [
  {
    id: 'chatgpt',
    label: 'Summarize on ChatGPT',
    Icon: SiOpenai,
    getUrl: (prompt: string) => `https://chat.openai.com/?prompt=${prompt}`,
    iconColor: '#0b0f18',
  },
  {
    id: 'perplexity',
    label: 'Summarize on Perplexity',
    Icon: SiPerplexity,
    getUrl: (prompt: string) => `https://www.perplexity.ai/search?q=${prompt}`,
    iconColor: '#0b0f18',
  },
  {
    id: 'claude',
    label: 'Summarize on Claude',
    Icon: SiClaude,
    getUrl: (prompt: string) => `https://claude.ai/new?q=${prompt}`,
    iconColor: '#cc785c',
  },
  {
    id: 'gemini',
    label: 'Summarize on Gemini',
    Icon: SiGooglegemini,
    getUrl: (prompt: string) => `https://gemini.google.com/app?q=${prompt}`,
    iconColor: '#4285F4',
  },
  {
    id: 'grok',
    label: 'Summarize on Grok',
    Icon: SiX,
    getUrl: (prompt: string) => `https://x.com/i/grok?text=${prompt}`,
    iconColor: '#0b0f18',
  },
];

export default function AISummarizeWidget() {
  const pathname = usePathname();

  function handleClick(getUrl: (p: string) => string) {
    const currentUrl = `${window.location.origin}${pathname}`;
    const promptText = `Summarize and analyze the key insights from this page: ${currentUrl}`;
    const encoded = encodeURIComponent(promptText);
    window.open(getUrl(encoded), '_blank');
  }

  return (
    <div className="rounded-[20px] border border-[#e6e9f2] bg-white">
      {/* Header */}
      <div className="px-5 py-4">
        <p className="text-[0.95rem] font-[500] text-[#0b0f18]">Summarize with AI</p>
      </div>
      <div className="h-px bg-[#e6e9f2]" />

      {/* Icons */}
      <div className="flex flex-wrap items-center justify-center gap-3 px-5 py-4">
        {AI_TOOLS.map((tool, index) => {
          const align =
            index === 0 ? 'left' : index === AI_TOOLS.length - 1 ? 'right' : 'center';
          const tooltipPosition =
            align === 'left'
              ? 'left-0'
              : align === 'right'
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';
          const arrowPosition =
            align === 'left'
              ? 'left-5'
              : align === 'right'
                ? 'right-5'
                : 'left-1/2';
          const Icon = tool.Icon;
          return (
          <div key={tool.id} className="group relative">
            <button
              type="button"
              onClick={() => handleClick(tool.getUrl)}
              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#e6e9f2] bg-white text-[#374151] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ color: tool.iconColor }}
              aria-label={tool.label}
            >
              <Icon className="h-5 w-5" />
            </button>
            {/* Tooltip */}
            <div
              className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-50 translate-y-1 whitespace-nowrap rounded-[8px] bg-[#111] px-2.5 py-1.5 text-[0.78rem] text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 ${tooltipPosition}`}
            >
              {tool.label}
              {/* Arrow */}
              <span className={`absolute top-full border-4 border-transparent border-t-[#111] ${arrowPosition}`} />
            </div>
          </div>
        );
        })}
      </div>

      {/* Footer note */}
      <p className="pb-3 text-center text-[0.78rem] text-[#9ca3af]">Opens in a new tab</p>
    </div>
  );
}
