'use client';

import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  SiOpenai,
  SiGooglegemini,
  SiClaude,
  SiPerplexity,
  SiX,
  SiReplicate,
  SiHuggingface,
  SiGradio,
  SiPixlr,
} from 'react-icons/si';

const ICONS: Record<string, React.ElementType> = {
  ChatGPT: SiOpenai,
  Gemini: SiGooglegemini,
  Claude: SiClaude,
  Perplexity: SiPerplexity,
  Grok: SiX,
  Replicate: SiReplicate,
  HuggingFace: SiHuggingface,
  Gradio: SiGradio,
  Pixlr: SiPixlr,
};

const LEGACY_LLM_SLUGS: Record<string, string> = {
  canva: 'pixlr',
};

function toCanonicalLlmName(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const target = LEGACY_LLM_SLUGS[normalized] ?? normalized;
  return Object.keys(ICONS).find((key) => key.toLowerCase() === target) ?? null;
}

export function PromptWidgetHydrator() {
  useEffect(() => {
    let isCancelled = false;
    let listenerAttached = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const hydrateWidgets = () => {
      if (isCancelled) return;

      // 1. Hydrate icons by reading data-llms from the widget container
      // This provides backwards compatibility for older DB saves
      const widgets = document.querySelectorAll('.prompt-widget:not([data-hydrated])');
      widgets.forEach((widget) => {
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

        const canonicalLlms = Array.from(
          new Set(llms.map((llm) => toCanonicalLlmName(llm)).filter((llm): llm is string => !!llm)),
        );

        if (canonicalLlms.length === 0) {
          return;
        }

        // Clear container and inject fresh icon buttons
        llmsContainer.innerHTML = '';
        widget.setAttribute('data-hydrated', 'true');

        canonicalLlms.forEach((llm) => {
          const Icon = ICONS[llm] as React.ElementType;

          const badge = document.createElement('button');
          badge.className = `prompt-widget-llm prompt-widget-llm-${llm.toLowerCase()} is-active`;
          badge.type = 'button';
          badge.title = `Try on ${llm}`;
          badge.setAttribute('data-tooltip', `Try on ${llm}`);

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
              Replicate: 'https://replicate.com/',
              HuggingFace: 'https://huggingface.co/',
              Gradio: 'https://www.gradio.app/',
              Pixlr: 'https://pixlr.com/',
            };

            if (urls[llm]) {
              window.open(urls[llm], '_blank');
            }
          });
        });
      });
    };

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

    const scheduleHydration = () => {
      const run = () => {
        if (isCancelled) return;
        hydrateWidgets();
        document.addEventListener('click', handleClick);
        listenerAttached = true;
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(run, { timeout: 1200 });
        return;
      }

      timeoutId = setTimeout(run, 200);
    };

    scheduleHydration();

    return () => {
      isCancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      if (!listenerAttached) return;
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}
