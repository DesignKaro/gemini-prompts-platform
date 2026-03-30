import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptContentSection } from '../app/[categorySlug]/[promptSlug]/prompt-content-section';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe('PromptContentSection locked view', () => {
  it('renders media with blurred teaser and hides full prompt body for locked prompts', () => {
    render(
      <PromptContentSection
        title="Locked Prompt"
        promptImageSlides={[
          'https://example.com/featured.jpg',
          'https://example.com/gallery-1.jpg',
        ]}
        isLocked
        isSignedIn={false}
        hasHtmlContent
        promptText="SECRET PROMPT BODY"
        promptContent="<p>SECRET PROMPT BODY</p>"
      />,
    );

    expect(screen.getByAltText('Locked Prompt cover')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unlock Exclusive' })).toHaveAttribute(
      'href',
      '/membership',
    );
    expect(screen.getByTestId('locked-prompt-teaser').className).toContain('blur-[4px]');
    expect(screen.queryByText('SECRET PROMPT BODY')).not.toBeInTheDocument();
  });
});
