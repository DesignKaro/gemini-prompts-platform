'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SavedPromptsPage() {
  const { data: session, status } = useSession();
  const [savedPrompts, setSavedPrompts] = useState<
    Array<{ id: string; title: string; promptType: string; image: string | null; savedAt: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.apiAccessToken) {
      return;
    }

    let isActive = true;
    setError(null);

    fetch(`${apiBaseUrl}/api/auth/profile/summary`, {
      headers: {
        Authorization: `Bearer ${session.apiAccessToken}`,
      },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Unable to load saved prompts.');
        }
        return response.json() as Promise<{
          savedPrompts: Array<{
            id: string;
            title: string;
            promptType: string;
            image: string | null;
            savedAt: string;
          }>;
        }>;
      })
      .then((payload) => {
        if (!isActive) return;
        setSavedPrompts(payload.savedPrompts);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setError(err.message);
      });

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, session?.apiAccessToken, status]);

  return (
    <main className="homepage-headings w-full pb-20 pt-4">
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-[1380px]">
          <div className="rounded-[30px] border border-[#e2e6ee] bg-white p-6 sm:p-8 lg:p-10">
            <h1 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.05em] text-[#0f1116] sm:text-[2.6rem]">
              Saved prompts
            </h1>
            <p className="mt-3 max-w-[36rem] text-[0.92rem] leading-7 text-[#667080]">
              Review and manage everything you have saved.
            </p>

            {error ? (
              <p className="mt-6 text-[0.9rem] text-[#d2603a]">{error}</p>
            ) : (
              <div className="mt-6 space-y-4">
                {savedPrompts.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#d8dde6] bg-white p-4 text-[0.9rem] text-[#7a8292] sm:p-5">
                    No saved prompts yet.
                  </div>
                ) : (
                  savedPrompts.map((prompt) => (
                    <article
                      key={prompt.id}
                      className="flex flex-col gap-4 rounded-[24px] border border-[#dde3eb] bg-white p-4 sm:flex-row sm:items-center"
                    >
                      <div
                        className="h-[140px] w-full rounded-[20px] bg-cover bg-center sm:h-[120px] sm:w-[180px]"
                        style={{
                          backgroundImage: `url(${
                            prompt.image ??
                            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200'
                          })`,
                        }}
                      />
                      <div className="flex-1">
                        <span className="rounded-full bg-[#f0f2f6] px-3 py-1 text-[0.8rem] text-[#4a5261]">
                          {prompt.promptType}
                        </span>
                        <h3 className="mt-3 text-[1.05rem] leading-[1.3] text-[#10141c] sm:text-[1.15rem]">
                          {prompt.title}
                        </h3>
                        <p className="mt-2 text-[0.85rem] text-[#7a8292]">{prompt.savedAt}</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-[#d4d9e2] px-4 py-2 text-[0.8rem] text-[#10141c] transition-colors duration-300 hover:border-[#10141c] hover:bg-[#10141c] hover:text-white"
                      >
                        Open
                      </button>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
