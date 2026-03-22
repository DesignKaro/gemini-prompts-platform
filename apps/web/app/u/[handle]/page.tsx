import { notFound } from 'next/navigation';
import { AuthorAvatar } from '../../components/author-avatar';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

type PublicProfileResponse = {
  user: {
    handle: string;
    name: string | null;
    profileTitle: string | null;
    bio: string | null;
    focusTags: string[] | null;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  };
  stats: {
    promptCount: number;
  };
  prompts: Array<{
    id: string;
    slug: string;
    title: string;
    promptType: string;
    image: string | null;
    publishedAt: string | null;
  }>;
};

const formatPromptType = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const response = await fetch(
    `${apiBaseUrl}/api/auth/profile/public/${encodeURIComponent(handle)}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as PublicProfileResponse;

  return (
    <main className="homepage-headings w-full pb-20 pt-4">
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <div className="page-container-narrow space-y-8">
          <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-5 sm:flex-nowrap sm:justify-between">
              <div className="flex items-center gap-4">
                <AuthorAvatar
                  name={payload.user.name || payload.user.handle}
                  avatarUrl={payload.user.avatarUrl}
                  avatarUpdatedAt={payload.user.avatarUpdatedAt}
                  className="h-16 w-16 rounded-[22px]"
                  imageClassName="object-cover"
                  initialClassName="text-[1rem]"
                  alt={`${payload.user.name || payload.user.handle} profile`}
                />
                <div>
                  <p className="text-[1.4rem] leading-[1.1] text-[#0f1116] sm:text-[1.6rem]">
                    {payload.user.name || 'Creator profile'}
                  </p>
                  <p className="mt-1 text-[0.92rem] text-[#6a7280] sm:text-[0.98rem]">
                    {payload.user.profileTitle || 'Prompt creator'}
                  </p>
                  <p className="mt-1 text-[0.82rem] text-[#9aa1ae]">@{payload.user.handle}</p>
                </div>
              </div>
              <div className="rounded-full border border-[#e2e6ee] px-4 py-2 text-[0.82rem] text-[#606874]">
                {payload.stats.promptCount} prompt{payload.stats.promptCount === 1 ? '' : 's'}
              </div>
            </div>

            {payload.user.bio ? (
              <p className="mt-5 max-w-[40rem] text-[0.95rem] leading-7 text-[#606874]">
                {payload.user.bio}
              </p>
            ) : null}

            {payload.user.focusTags && payload.user.focusTags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {payload.user.focusTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#f1f3f8] px-4 py-1.5 text-[0.78rem] text-[#2f3440]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[1.4rem] text-[#0f1116] sm:text-[1.6rem]">Prompt library</h2>
                <p className="mt-1 text-[0.92rem] text-[#6a7280]">
                  Public prompt packs shared by this creator.
                </p>
              </div>
            </div>

            {payload.prompts.length === 0 ? (
              <div className="mt-6 rounded-[18px] border border-dashed border-[#d6dbe5] px-6 py-8 text-[0.9rem] text-[#7a8292]">
                No public prompts yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {payload.prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="flex flex-wrap items-center gap-4 rounded-[20px] border border-[#e2e6ee] bg-white p-4"
                  >
                    <div
                      className="h-20 w-28 flex-shrink-0 rounded-[16px] bg-[#f2f4f8] bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${
                          prompt.image ||
                          'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=400'
                        })`,
                      }}
                    />
                    <div className="flex-1">
                      <span className="rounded-full bg-[#f1f3f8] px-3 py-1 text-[0.72rem] text-[#2f3440]">
                        {formatPromptType(prompt.promptType)}
                      </span>
                      <p className="mt-2 text-[1rem] text-[#0f1116] sm:text-[1.05rem]">
                        {prompt.title}
                      </p>
                    </div>
                    <a
                      href={`/prompt/${prompt.slug}`}
                      className="rounded-full border border-[#d7dde6] px-4 py-2 text-[0.82rem] text-[#0f1116] transition-colors duration-300 hover:border-[#0f1116] hover:bg-[#0f1116] hover:text-white"
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
