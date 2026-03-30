import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptCardServer } from '../app/components/prompt-card-server';
import { PromptCardUI } from '../app/components/prompt-listing';
import type { PublicPrompt } from '../lib/public-content';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('../app/components/prompt-interactions/use-prompt-interactions', () => ({
  usePromptInteractions: () => ({
    likeCount: 0,
    commentCount: 0,
    likedByIp: false,
    savedByUser: false,
    likePending: false,
    savePending: false,
    likePrompt: vi.fn(),
    toggleSavePrompt: vi.fn(),
  }),
}));

vi.mock('../app/components/prompt-card-interactions', () => ({
  PromptCardInteractions: () => <div data-testid="prompt-card-interactions" />,
}));

function buildPrompt(visibility: PublicPrompt['visibility']): PublicPrompt {
  return {
    id: 'prompt_1',
    slug: 'prompt-one',
    title: 'Prompt One',
    description: 'Description',
    promptType: 'CONTENT',
    visibility,
    image: 'https://example.com/prompt.jpg',
    galleryImages: [],
    publishedAt: '2026-03-29T10:00:00.000Z',
    updatedAt: '2026-03-29T10:00:00.000Z',
    viewCount: 0,
    likeCount: 0,
    saveCount: 0,
    commentCount: 0,
    isLocked: visibility === 'EXCLUSIVE',
    requiresMembership: visibility === 'EXCLUSIVE',
    author: {
      id: 'author_1',
      name: 'Author',
      handle: 'author',
      slug: 'author',
      profileTitle: null,
      bio: null,
      avatarUrl: null,
      avatarUpdatedAt: null,
    },
    primaryCategory: {
      id: 'cat_1',
      name: 'Category',
      slug: 'category',
    },
    categories: [],
    tags: [],
  };
}

describe('Prompt card exclusive badge', () => {
  it('renders the badge on client prompt cards for exclusive prompts', () => {
    render(<PromptCardUI prompt={buildPrompt('EXCLUSIVE')} />);
    expect(screen.getByText('Exclusive')).toBeInTheDocument();
  });

  it('renders the badge on server prompt cards for exclusive prompts', () => {
    render(<PromptCardServer prompt={buildPrompt('EXCLUSIVE')} />);
    expect(screen.getByText('Exclusive')).toBeInTheDocument();
  });

  it('does not render the badge for free prompts', () => {
    render(<PromptCardUI prompt={buildPrompt('FREE')} />);
    expect(screen.queryByText('Exclusive')).not.toBeInTheDocument();
  });
});
