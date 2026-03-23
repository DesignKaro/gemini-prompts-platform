'use client';

import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SiOpenai, SiGooglegemini, SiClaude, SiPerplexity, SiX } from 'react-icons/si';

const ICONS: Record<string, React.ElementType> = {
  ChatGPT: SiOpenai,
  Gemini: SiGooglegemini,
  Claude: SiClaude,
  Perplexity: SiPerplexity,
  Grok: SiX,
};

export function PromptWidgetHydrator() {
  useEffect(() => {
    // 1. Hydrate icons by reading data-llms from the widget container
    // This provides backwards compatibility for older DB saves
    const widgets = document.querySelectorAll('.prompt-widget:not([data-hydrated])');
    widgets.forEach((widget) => {
      widget.setAttribute('data-hydrated', 'true');

      const llmsContainer = widget.querySelector('.prompt-widget-llms');
      if (!llmsContainer) return;

      let llms: string[] = [];
      const rawLlms = widget.getAttribute('data-llms');
      if (rawLlms) {
        try {
          llms = JSON.parse(rawLlms);
        } catch {
          // ignore parsing error
        }
      }

      // If missing from wrapper, fallback to checking internal spans
      if (llms.length === 0) {
        const spans = llmsContainer.querySelectorAll('.prompt-widget-llm');
        spans.forEach((span) => {
          const l = span.getAttribute('data-llm');
          if (l) llms.push(l);
        });
      }

      // Clear container and inject fresh icon buttons
      llmsContainer.innerHTML = '';

      llms.forEach((llm) => {
        if (ICONS[llm]) {
          const Icon = ICONS[llm] as React.ElementType;

          const badge = document.createElement('button');
          badge.className = `prompt-widget-llm prompt-widget-llm-${llm.toLowerCase()} is-active`;
          badge.type = 'button';
          badge.title = llm;

          const root = createRoot(badge);
          root.render(<Icon size={18} />);
          llmsContainer.appendChild(badge);

          // Add click listener: copy prompt & open new tab
          badge.addEventListener('click', (e) => {
            e.preventDefault();

            const content = widget.querySelector('.prompt-widget-content');
            if (content) {
              const textToCopy = content.textContent || '';
              navigator.clipboard.writeText(textToCopy.trim()).catch(() => {});
            }

            const urls: Record<string, string> = {
              ChatGPT: 'https://chatgpt.com/',
              Gemini: 'https://gemini.google.com/',
              Claude: 'https://claude.ai/new',
              Perplexity: 'https://www.perplexity.ai/',
              Grok: 'https://x.com/i/grok',
            };

            if (urls[llm]) {
              window.open(urls[llm], '_blank');
            }
          });
        }
      });
    });

    // 2. Global listener for Copy buttons
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.prompt-widget-copy-btn');

      if (!btn) return;

      const widget = btn.closest('.prompt-widget');
      if (!widget) return;

      const content = widget.querySelector('.prompt-widget-content');
      if (!content) return;

      const textToCopy = content.textContent || '';

      navigator.clipboard
        .writeText(textToCopy.trim())
        .then(() => {
          btn.classList.add('copied');
          const textSpan = btn.querySelector('.prompt-widget-copy-text');
          if (textSpan) textSpan.textContent = 'Copied!';

          setTimeout(() => {
            btn.classList.remove('copied');
            if (textSpan) textSpan.textContent = 'Copy';
          }, 2000);
        })
        .catch((err) => {
          console.error('Failed to copy prompt text: ', err);
        });
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}
