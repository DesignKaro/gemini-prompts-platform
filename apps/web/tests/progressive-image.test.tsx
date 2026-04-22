import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressiveImage } from '../app/components/progressive-image';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe('ProgressiveImage', () => {
  it('shows a glass loading overlay before the image loads and fades it out afterward', () => {
    const { container } = render(
      <div className="relative h-40 w-40">
        <ProgressiveImage src="https://example.com/hero.jpg" alt="Hero" fill sizes="160px" />
      </div>,
    );

    const overlay = container.querySelector('[data-progressive-image-overlay]');
    const image = screen.getByAltText('Hero');

    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('data-state', 'loading');

    fireEvent.load(image);

    expect(overlay).toHaveAttribute('data-state', 'loaded');
    expect(overlay?.className).toContain('opacity-0');
  });

  it('keeps the image alt text and class props intact', () => {
    render(
      <div className="relative h-24 w-24">
        <ProgressiveImage
          src="https://example.com/thumb.jpg"
          alt="Thumbnail"
          fill
          sizes="96px"
          className="object-cover rounded-[12px]"
        />
      </div>,
    );

    const image = screen.getByAltText('Thumbnail');
    expect(image).toHaveClass('object-cover');
    expect(image).toHaveClass('rounded-[12px]');
  });

  it('can disable the glass loading overlay', () => {
    const { container } = render(
      <div className="relative h-24 w-24">
        <ProgressiveImage
          src="https://example.com/plain.jpg"
          alt="Plain"
          fill
          sizes="96px"
          showGlassLoading={false}
        />
      </div>,
    );

    expect(container.querySelector('[data-progressive-image-overlay]')).not.toBeInTheDocument();
  });
});
