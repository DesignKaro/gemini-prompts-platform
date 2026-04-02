import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LegacyContentEditorPage from '../../app/dashboard/content/new/_legacy-screen';

const { requestMock, replaceMock, searchParamsState } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsState: { current: new URLSearchParams('type=prompt') },
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockRichTextEditor(props: {
      value: string;
      onChange: (nextValue: string) => void;
    }) {
      return (
        <textarea
          aria-label="Prompt body"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      );
    },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => searchParamsState.current,
}));

vi.mock('../../app/components/dashboard/use-admin-api', () => ({
  useAdminApi: () => ({
    request: requestMock,
    status: 'authenticated',
  }),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe('Content editor visibility controls', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    requestMock.mockReset();
    searchParamsState.current = new URLSearchParams('type=prompt');

    requestMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === '/api/admin/categories?take=200') {
        return { items: [] };
      }

      if (path === '/api/admin/tags?take=200') {
        return { items: [] };
      }

      if (path === '/api/admin/prompts/prompt_1' && options?.method === 'PATCH') {
        return {};
      }

      if (path === '/api/admin/prompts/prompt_1') {
        return {
          id: 'prompt_1',
          title: 'Exclusive Prompt',
          slug: 'exclusive-prompt',
          description: 'Description',
          content: 'Locked prompt content',
          status: 'PUBLISHED',
          visibility: 'EXCLUSIVE',
          tags: [],
          categories: [],
          galleryImageUrls: [],
          galleryImageRefs: [],
        };
      }

      if (path === '/api/admin/prompts/prompt_2') {
        return {
          id: 'prompt_2',
          title: 'Follow-up Prompt',
          slug: 'follow-up-prompt',
          description: 'Description',
          content: 'Follow-up prompt content',
          status: 'DRAFT',
          visibility: 'FREE',
          tags: [],
          categories: [],
          galleryImageUrls: [],
          galleryImageRefs: [],
        };
      }

      if (path === '/api/admin/prompts' && options?.method === 'POST') {
        return {
          id: 'prompt_new',
        };
      }

      throw new Error(`Unhandled request in test: ${path}`);
    });
  });

  it('renders visibility selector and includes selected visibility on create', async () => {
    render(<LegacyContentEditorPage />);

    expect(screen.getByLabelText('Free')).toBeInTheDocument();
    expect(screen.getByLabelText('Exclusive')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Write a title...'), {
      target: { value: 'Visibility Test Prompt' },
    });
    fireEvent.change(screen.getByLabelText('Prompt body'), {
      target: { value: 'Prompt body text' },
    });
    fireEvent.click(screen.getByLabelText('Exclusive'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      const createCall = requestMock.mock.calls.find(
        (call) => call[0] === '/api/admin/prompts' && call[1]?.method === 'POST',
      );
      expect(createCall).toBeTruthy();
      const payload = JSON.parse(String(createCall?.[1]?.body ?? '{}'));
      expect(payload.visibility).toBe('EXCLUSIVE');
    });
  });

  it('preselects exclusive visibility on edit and includes selected visibility on update', async () => {
    searchParamsState.current = new URLSearchParams('type=prompt&edit=prompt_1');

    render(<LegacyContentEditorPage />);

    await screen.findByDisplayValue('Exclusive Prompt');

    const exclusiveRadio = screen.getByLabelText('Exclusive') as HTMLInputElement;
    expect(exclusiveRadio.checked).toBe(true);

    fireEvent.click(screen.getByLabelText('Free'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      const patchCall = requestMock.mock.calls.find(
        (call) => call[0] === '/api/admin/prompts/prompt_1' && call[1]?.method === 'PATCH',
      );
      expect(patchCall).toBeTruthy();
      const payload = JSON.parse(String(patchCall?.[1]?.body ?? '{}'));
      expect(payload.visibility).toBe('FREE');
    });
  });

  it('locks edit fields until hydration resolves and hydrates once per edit target', async () => {
    searchParamsState.current = new URLSearchParams('type=prompt&edit=prompt_1');
    const firstLoad = createDeferred<{
      id: string;
      title: string;
      slug: string;
      description: string;
      content: string;
      status: 'PUBLISHED';
      visibility: 'EXCLUSIVE';
      tags: [];
      categories: [];
      galleryImageUrls: [];
      galleryImageRefs: [];
    }>();

    requestMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === '/api/admin/categories?take=200') {
        return { items: [] };
      }

      if (path === '/api/admin/tags?take=200') {
        return { items: [] };
      }

      if (path === '/api/admin/prompts/prompt_1' && options?.method === 'PATCH') {
        return {};
      }

      if (path === '/api/admin/prompts/prompt_1') {
        return firstLoad.promise;
      }

      if (path === '/api/admin/prompts/prompt_2') {
        return {
          id: 'prompt_2',
          title: 'Follow-up Prompt',
          slug: 'follow-up-prompt',
          description: 'Description',
          content: 'Follow-up prompt content',
          status: 'DRAFT',
          visibility: 'FREE',
          tags: [],
          categories: [],
          galleryImageUrls: [],
          galleryImageRefs: [],
        };
      }

      if (path === '/api/admin/prompts' && options?.method === 'POST') {
        return {
          id: 'prompt_new',
        };
      }

      throw new Error(`Unhandled request in test: ${path}`);
    });

    const { rerender } = render(<LegacyContentEditorPage />);

    const titleInput = screen.getByPlaceholderText('Write a title...') as HTMLInputElement;
    expect(titleInput).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText('Loading content details...')).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: 'Typing before hydration' } });
    expect(titleInput.value).toBe('');

    firstLoad.resolve({
      id: 'prompt_1',
      title: 'Exclusive Prompt',
      slug: 'exclusive-prompt',
      description: 'Description',
      content: 'Locked prompt content',
      status: 'PUBLISHED',
      visibility: 'EXCLUSIVE',
      tags: [],
      categories: [],
      galleryImageUrls: [],
      galleryImageRefs: [],
    });

    await screen.findByDisplayValue('Exclusive Prompt');
    expect(titleInput).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
    expect(screen.queryByText('Loading content details...')).not.toBeInTheDocument();

    searchParamsState.current = new URLSearchParams('type=prompt&edit=prompt_2');
    rerender(<LegacyContentEditorPage />);

    await screen.findByDisplayValue('Follow-up Prompt');
    const promptReadCalls = requestMock.mock.calls.filter(
      (call) => call[0] === '/api/admin/prompts/prompt_1' || call[0] === '/api/admin/prompts/prompt_2',
    );
    expect(promptReadCalls.filter((call) => call[0] === '/api/admin/prompts/prompt_1')).toHaveLength(1);
    expect(promptReadCalls.filter((call) => call[0] === '/api/admin/prompts/prompt_2')).toHaveLength(1);
  });
});
