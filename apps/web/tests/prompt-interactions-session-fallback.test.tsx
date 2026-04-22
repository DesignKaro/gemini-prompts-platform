import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePromptInteractions } from '../app/components/prompt-interactions/use-prompt-interactions';

describe('usePromptInteractions session fallback', () => {
  it('does not crash when SessionProvider is missing', async () => {
    const { result } = renderHook(() =>
      usePromptInteractions({
        promptId: 'prompt_1',
        initialLikeCount: 3,
        initialSaveCount: 2,
        initialCommentCount: 1,
        syncStatus: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.statusReady).toBe(true);
    });
    expect(result.current.likeCount).toBe(3);
    expect(result.current.saveCount).toBe(2);
  });
});
