import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import PromptBoxNodeView from './PromptBoxNodeView';

export const PromptBox = Node.create({
  name: 'promptBox',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      selectedLlms: {
        default: [],
        parseHTML: (element) => {
          const llms = element.getAttribute('data-llms');
          return llms ? JSON.parse(llms) : [];
        },
        renderHTML: (attributes) => {
          return {
            'data-llms': JSON.stringify(attributes.selectedLlms),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="prompt-box"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const llms = (node.attrs.selectedLlms || []) as string[];
    const llmTags = llms.map((l) => [
      'span',
      { class: `prompt-widget-llm prompt-widget-llm-${l.toLowerCase()}`, 'data-llm': l, title: l },
    ]);

    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'prompt-box', class: 'prompt-widget' }),
      ['div', { class: 'prompt-widget-header' },
        ['div', { class: 'prompt-widget-llms' }, ...llmTags],
        ['button', { class: 'prompt-widget-copy-btn', type: 'button', 'aria-label': 'Copy prompt' },
          ['svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
            ['rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }],
            ['path', { d: 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' }]
          ],
          ['span', { class: 'prompt-widget-copy-text' }, 'Copy']
        ]
      ],
      ['div', { class: 'prompt-widget-content' }, 0]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PromptBoxNodeView);
  },
});
