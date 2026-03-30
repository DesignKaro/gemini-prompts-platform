import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptCommentsSection } from '../app/[categorySlug]/[promptSlug]/prompt-client';

const { mockFetchPromptComments } = vi.hoisted(() => ({
  mockFetchPromptComments: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('../app/components/prompt-interactions/use-prompt-interactions', () => ({
  usePromptInteractions: () => ({
    isAuthenticated: false,
    redirectToSignIn: vi.fn(),
    getRequiredAccessToken: vi.fn(),
    getOptionalAccessToken: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('../lib/prompt-interactions', async () => {
  const actual = await vi.importActual<typeof import('../lib/prompt-interactions')>(
    '../lib/prompt-interactions',
  );

  return {
    ...actual,
    fetchPromptComments: mockFetchPromptComments,
  };
});

describe('PromptCommentsSection read-only mode', () => {
  it('renders comments while hiding write and interaction controls', async () => {
    mockFetchPromptComments.mockResolvedValue({
      total: 2,
      items: [
        {
          id: 'comment_1',
          content: 'Great structure for this prompt.',
          createdAt: '2026-03-29T09:00:00.000Z',
          status: 'APPROVED',
          likeCount: 7,
          likedByViewer: false,
          replyCount: 1,
          author: {
            id: 'user_1',
            name: 'Ava',
            slug: 'ava',
            avatarUrl: null,
            avatarUpdatedAt: null,
          },
          replies: [
            {
              id: 'reply_1',
              content: 'Thanks for sharing!',
              createdAt: '2026-03-29T10:00:00.000Z',
              status: 'APPROVED',
              likeCount: 3,
              likedByViewer: false,
              author: {
                id: 'user_2',
                name: 'Noah',
                slug: 'noah',
                avatarUrl: null,
                avatarUpdatedAt: null,
              },
            },
          ],
        },
      ],
    });

    render(<PromptCommentsSection promptId="prompt_1" initialCommentCount={0} readOnly />);

    await waitFor(() => {
      expect(screen.getByText('2 approved comments.')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Comments are open for reading. Prompt details are locked for members.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Great structure for this prompt.')).toBeInTheDocument();
    expect(screen.getByText('Thanks for sharing!')).toBeInTheDocument();
    expect(screen.getByText('7 likes')).toBeInTheDocument();
    expect(screen.getByText('3 likes')).toBeInTheDocument();

    expect(screen.queryByText('Add comment')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign in to write a comment.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit comment' })).not.toBeInTheDocument();
    expect(screen.queryByText('Log in to Reply')).not.toBeInTheDocument();
  });
});
