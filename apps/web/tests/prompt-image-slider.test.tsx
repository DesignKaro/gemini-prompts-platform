import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PromptImageSlider } from '../app/[categorySlug]/[promptSlug]/prompt-image-slider';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe('PromptImageSlider', () => {
  it('starts at first image and moves when a thumbnail is clicked', () => {
    render(
      <PromptImageSlider
        title="Gallery Prompt"
        images={['https://example.com/one.jpg', 'https://example.com/two.jpg']}
      />,
    );

    const image = screen.getByAltText('Gallery Prompt cover') as HTMLImageElement;
    expect(image.src).toContain('https://example.com/one.jpg');

    fireEvent.click(screen.getByLabelText('Show image 2'));
    expect(image.src).toContain('https://example.com/two.jpg');
  });

  it('hides thumbnail controls when there is a single image', () => {
    render(<PromptImageSlider title="Single" images={['https://example.com/only.jpg']} />);

    expect(screen.queryByLabelText('Show image 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Show image 2')).not.toBeInTheDocument();
  });
});
