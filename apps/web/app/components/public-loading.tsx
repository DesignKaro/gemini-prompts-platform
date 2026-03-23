import { Skeleton } from './ui/skeleton';

type ArchiveLoadingProps = {
  cards?: number;
};

export function PublicArchiveLoading({ cards = 8 }: ArchiveLoadingProps) {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-12 w-[min(26rem,90%)]" />
          <Skeleton className="h-5 w-[min(42rem,95%)]" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={`public-archive-card-${index}`} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
              <Skeleton className="h-5 w-[85%]" />
              <Skeleton className="h-4 w-28" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="ml-auto h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PublicDetailLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-8">
        <Skeleton className="h-4 w-56" />

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <article className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
            <Skeleton className="h-14 w-[min(48rem,95%)]" />
            <Skeleton className="h-6 w-[min(44rem,95%)]" />
            <Skeleton className="aspect-[16/9] w-full rounded-[26px]" />
            <Skeleton className="h-64 w-full rounded-[18px]" />
            <Skeleton className="h-56 w-full rounded-[18px]" />
          </article>

          <aside className="space-y-5">
            <Skeleton className="h-48 w-full rounded-[20px]" />
            <Skeleton className="h-40 w-full rounded-[20px]" />
          </aside>
        </div>
      </div>
    </main>
  );
}

export function PublicSimpleLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-6">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-12 w-[min(22rem,85%)]" />
        <Skeleton className="h-5 w-[min(40rem,95%)]" />
      </div>
    </main>
  );
}

export function PublicHeroContentLoading() {
  return (
    <main className="page-shell-tight bg-white">
      <div className="page-container space-y-10">
        <Skeleton className="h-4 w-36" />

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-44 rounded-full" />
            <Skeleton className="h-14 w-[min(42rem,95%)]" />
            <Skeleton className="h-5 w-[min(38rem,95%)]" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-12 w-36 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-[320px] w-full rounded-[30px]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`hero-card-${index}`}
              className="space-y-4 rounded-[24px] border border-[#e6e9f2] p-6"
            >
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

type DirectoryLoadingProps = {
  cards?: number;
  circles?: boolean;
};

export function PublicDirectoryLoading({ cards = 8, circles = false }: DirectoryLoadingProps) {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-[min(30rem,95%)]" />
          <Skeleton className="h-5 w-[min(40rem,95%)]" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <div
              key={`directory-card-${index}`}
              className="rounded-[24px] border border-[#e6e9f2] p-6"
            >
              <Skeleton
                className={
                  circles ? 'mx-auto h-[120px] w-[120px] rounded-full' : 'h-14 w-14 rounded-full'
                }
              />
              <Skeleton className={`mt-5 h-6 ${circles ? 'mx-auto w-32' : 'w-36'}`} />
              <Skeleton className={`mt-3 h-4 ${circles ? 'mx-auto w-24' : 'w-40'}`} />
              <Skeleton className={`mt-6 h-10 rounded-full ${circles ? 'mx-auto w-36' : 'w-32'}`} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PublicTagCloudLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-[min(26rem,95%)]" />
          <Skeleton className="h-5 w-[min(40rem,95%)]" />
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#e1e4ea] bg-white">
          <div className="px-5 py-6 sm:px-7">
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 14 }).map((_, index) => (
                <Skeleton key={`tag-chip-${index}`} className="h-10 w-28 rounded-full" />
              ))}
            </div>
          </div>
          <div className="border-t border-[#e6e8ee] px-5 py-6 sm:px-7">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-4 h-12 w-full rounded-[12px]" />
            <Skeleton className="mt-3 h-4 w-64" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function PublicSearchLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container-reading space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-12 w-44" />
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full rounded-[14px]" />
            <Skeleton className="h-12 w-32 rounded-[14px]" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>

        <section>
          <Skeleton className="h-8 w-32" />
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`search-prompt-${index}`} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                <Skeleton className="h-5 w-[85%]" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function ContactLoading() {
  return (
    <main className="page-shell-tight bg-white">
      <div className="page-container space-y-8">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Skeleton className="h-12 w-44" />
            <Skeleton className="mt-4 h-5 w-[min(38rem,95%)]" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`contact-card-${index}`}
                  className="rounded-[24px] border border-[#e6e9f2] p-6"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="mt-4 h-6 w-24" />
                  <Skeleton className="mt-3 h-4 w-[90%]" />
                  <Skeleton className="mt-6 h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-[#e6e9f2] bg-[#f8fafc] p-8">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="mt-3 h-4 w-[90%]" />
            <div className="mt-7 space-y-4">
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-32 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function MembershipLoading() {
  return (
    <main className="page-shell-tight bg-white">
      <div className="page-container space-y-10">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-4">
          <Skeleton className="h-14 w-[min(36rem,95%)]" />
          <Skeleton className="h-5 w-[min(42rem,95%)]" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`membership-card-${index}`}
              className="rounded-[24px] border border-[#e6e9f2] p-6"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="mt-4 h-6 w-32" />
              <Skeleton className="mt-3 h-4 w-[95%]" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[380px] w-full rounded-[28px]" />
      </div>
    </main>
  );
}

export function NewsletterLandingLoading() {
  return (
    <main className="page-shell-tight bg-white">
      <div className="page-container space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-[min(28rem,95%)]" />
          <Skeleton className="h-5 w-[min(42rem,95%)]" />
        </div>
        <div className="rounded-[28px] border border-[#e6e9f2] bg-[#d5ea52] p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-4">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-12 w-[min(26rem,95%)]" />
              <Skeleton className="h-5 w-[min(30rem,95%)]" />
            </div>
            <div className="rounded-[26px] border border-white/70 bg-white/55 p-6">
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="mt-3 h-12 w-32 rounded-full" />
              <div className="mt-4 flex flex-wrap gap-3">
                <Skeleton className="h-6 w-36 rounded-full" />
                <Skeleton className="h-6 w-44 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function AuthorDetailLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-12">
        <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-[22px]" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
          <Skeleton className="mt-5 h-5 w-[min(34rem,95%)]" />
        </div>

        <section className="space-y-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`author-prompt-${index}`}
                className="h-[280px] w-full rounded-[24px]"
              />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`author-post-${index}`} className="h-[300px] w-full rounded-[24px]" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function CategoryDetailLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container space-y-12">
        <div className="grid gap-8 lg:grid-cols-[60%_1fr] lg:items-center">
          <div className="space-y-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-14 w-[min(34rem,95%)]" />
            <Skeleton className="h-5 w-[min(34rem,95%)]" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-[28px]" />
        </div>

        <section className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`category-prompt-${index}`}
                className="h-[280px] w-full rounded-[24px]"
              />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={`category-post-${index}`}
                className="h-[300px] w-full rounded-[24px]"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PublicProfileLoading() {
  return (
    <main className="homepage-headings w-full pb-20 pt-4">
      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <div className="page-container-narrow space-y-8">
          <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-[22px]" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-5 w-[min(34rem,95%)]" />
          </div>

          <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-8">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-2 h-4 w-72" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`public-profile-row-${index}`}
                  className="flex items-center gap-4 rounded-[20px] border border-[#e2e6ee] p-4"
                >
                  <Skeleton className="h-20 w-28 rounded-[16px]" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-32 rounded-full" />
                    <Skeleton className="h-5 w-[75%]" />
                  </div>
                  <Skeleton className="h-9 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ProfileSettingsLoading() {
  return (
    <main className="page-shell bg-white">
      <div className="page-container grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Skeleton className="h-12 w-[min(20rem,90%)]" />
          <Skeleton className="h-[420px] w-full rounded-[24px]" />
          <Skeleton className="h-[320px] w-full rounded-[24px]" />
        </div>
        <aside className="space-y-4">
          <Skeleton className="h-[220px] w-full rounded-[24px]" />
          <Skeleton className="h-[220px] w-full rounded-[24px]" />
        </aside>
      </div>
    </main>
  );
}

export function HomePageLoading() {
  return (
    <main className="homepage-headings w-full pb-20 pt-4">
      <section className="relative overflow-hidden py-10 text-center sm:py-12 lg:py-16">
        <div className="page-container-wide px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mt-2 flex max-w-[72rem] flex-col items-center gap-3">
            <Skeleton className="h-14 w-[min(46rem,96%)] rounded-[14px] sm:h-16 lg:h-20" />
            <Skeleton className="h-14 w-[min(40rem,92%)] rounded-[14px] sm:h-16 lg:h-20" />
          </div>

          <div className="mt-6 h-[220px] w-full sm:h-[430px] lg:mt-8 lg:h-[470px]">
            <div className="no-scrollbar flex h-full items-end gap-3 overflow-x-auto pb-3 pt-4 sm:gap-5 sm:pb-5 sm:pt-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={`hero-card-skeleton-${index}`}
                  className="h-[190px] w-[168px] shrink-0 rounded-[22px] sm:h-[340px] sm:w-[240px] sm:rounded-[30px]"
                />
              ))}
            </div>
          </div>

          <div className="mx-auto mt-5 max-w-[44rem] space-y-2">
            <Skeleton className="h-5 w-full rounded-full" />
            <Skeleton className="h-5 w-[85%] rounded-full" />
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-28 rounded-full" />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-[320px]" />
            <div className="hidden items-center gap-3 sm:flex">
              <Skeleton className="h-11 w-44 rounded-full" />
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
            </div>
          </div>

          <div className="no-scrollbar mt-5 flex items-start gap-8 overflow-x-auto pb-2 sm:mt-7">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`topics-skeleton-${index}`}
                className="flex shrink-0 flex-col items-center text-center"
              >
                <Skeleton className="h-[84px] w-[84px] rounded-full sm:h-[112px] sm:w-[112px] lg:h-[96px] lg:w-[96px]" />
                <Skeleton className="mt-3 h-4 w-24 rounded-full sm:mt-4" />
                <Skeleton className="mt-2 h-3.5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-[260px]" />
            <Skeleton className="h-11 w-44 rounded-full" />
          </div>
          <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <article key={`home-trending-skeleton-${index}`} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                <Skeleton className="h-5 w-[85%]" />
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
            <Skeleton className="min-h-[280px] rounded-[28px] sm:min-h-[420px] sm:rounded-[32px] lg:min-h-[560px] lg:rounded-[34px]" />
            <div className="rounded-[28px] bg-[#f4f3ef] p-5 sm:rounded-[32px] sm:p-8 lg:rounded-[34px] lg:p-10">
              <Skeleton className="h-12 w-56" />
              <div className="mt-5 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[92%]" />
              </div>
              <div className="mt-8 space-y-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`accordion-skeleton-${index}`}
                    className="flex items-center justify-between border-b border-[#d8d4ca] pb-4"
                  >
                    <Skeleton className="h-8 w-52" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:mt-6 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.45fr] xl:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`benefit-skeleton-${index}`}
                className="min-h-[280px] rounded-[24px] bg-[#f7f7f7] p-5 sm:min-h-[320px] sm:rounded-[28px] sm:p-8"
              >
                <Skeleton className="h-10 w-36" />
                <Skeleton className="mt-8 h-4 w-[90%]" />
                <Skeleton className="mt-3 h-4 w-[78%]" />
                <Skeleton className="mt-10 h-11 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-[320px]" />
            <div className="hidden items-center gap-3 sm:flex">
              <Skeleton className="h-11 w-44 rounded-full" />
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
              <Skeleton className="h-[54px] w-[54px] rounded-full" />
            </div>
          </div>
          <div className="no-scrollbar mt-5 flex items-start gap-8 overflow-x-auto pb-2 sm:mt-7">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`authors-skeleton-${index}`}
                className="flex shrink-0 flex-col items-center text-center"
              >
                <Skeleton className="h-[84px] w-[84px] rounded-full sm:h-[112px] sm:w-[112px] lg:h-[96px] lg:w-[96px]" />
                <Skeleton className="mt-3 h-4 w-24 rounded-full sm:mt-4" />
                <Skeleton className="mt-2 h-3.5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide rounded-[30px] bg-[#d5ea52] px-6 py-8 sm:px-10 sm:py-10 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-12 lg:py-12">
          <div className="max-w-[34rem] space-y-4">
            <Skeleton className="h-14 w-[min(20rem,95%)]" />
            <Skeleton className="h-5 w-[min(26rem,95%)]" />
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>
          <div className="mt-10 min-h-[260px] lg:mt-0 lg:min-h-[420px]">
            <Skeleton className="h-full w-full rounded-[28px]" />
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-[360px]" />
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>
          <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2 sm:mt-7 sm:gap-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`more-posts-skeleton-${index}`}
                className="w-[260px] shrink-0 sm:w-[320px] lg:w-[calc((100%-2.5rem)/3)]"
              >
                <Skeleton className="aspect-[16/9] w-full rounded-[20px]" />
                <Skeleton className="mt-4 h-6 w-[92%]" />
                <Skeleton className="mt-2 h-6 w-[72%]" />
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Skeleton className="h-9 w-24 rounded-[10px]" />
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide overflow-hidden rounded-[20px] border border-[#e1e4ea] bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {Array.from({ length: 14 }).map((_, index) => (
              <Skeleton
                key={`home-tag-skeleton-${index}`}
                className="h-[42px] w-[120px] rounded-full"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide rounded-[34px] bg-white px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="space-y-5">
              <Skeleton className="h-14 w-56" />
              <Skeleton className="h-5 w-[90%]" />
              <div className="flex items-center gap-3 pt-5">
                <Skeleton className="h-[56px] w-[56px] rounded-full" />
                <Skeleton className="h-[56px] w-[56px] rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-12" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-[88%]" />
              <div className="flex items-center gap-4 pt-3">
                <Skeleton className="h-[68px] w-[68px] rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide overflow-hidden rounded-[34px] bg-[#f2f3f5] py-10 sm:py-12 lg:py-14">
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton
                key={`community-top-skeleton-${index}`}
                className="h-[80px] w-[80px] shrink-0 rounded-[22px] sm:h-[96px] sm:w-[96px]"
              />
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-[42rem] px-6 text-center sm:mt-12">
            <Skeleton className="mx-auto h-12 w-[min(24rem,95%)]" />
            <Skeleton className="mx-auto mt-5 h-5 w-[min(26rem,95%)]" />
            <Skeleton className="mx-auto mt-7 h-11 w-40 rounded-full" />
          </div>
          <div className="no-scrollbar mt-10 flex gap-3 overflow-x-auto px-5 sm:mt-12">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton
                key={`community-bottom-skeleton-${index}`}
                className="h-[80px] w-[80px] shrink-0 rounded-[22px] sm:h-[96px] sm:w-[96px]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <Skeleton className="h-12 w-[280px]" />
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`watch-read-listen-home-skeleton-${index}`}
                className="rounded-[20px] border border-[#dfe2e8] bg-white p-4 sm:p-5 lg:p-6"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_220px] sm:items-stretch">
                  <div className="flex flex-col">
                    <div className="flex gap-2">
                      <Skeleton className="h-7 w-28 rounded-full" />
                      <Skeleton className="h-7 w-24 rounded-full" />
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <Skeleton className="h-6 w-full rounded-full" />
                      <Skeleton className="h-6 w-[75%] rounded-full" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="min-h-[170px] rounded-[20px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide rounded-[30px] border border-[#e6e9ef] bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="text-center">
            <Skeleton className="mx-auto h-12 w-[min(24rem,95%)]" />
            <Skeleton className="mx-auto mt-4 h-5 w-[min(34rem,95%)]" />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr] lg:gap-10">
            <aside className="rounded-[18px] border border-[#eceff4] bg-[#fafbfd] p-4 sm:p-5">
              <Skeleton className="h-6 w-40" />
              <div className="mt-4 space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={`faq-cat-skeleton-${index}`}
                    className="h-10 w-full rounded-[10px]"
                  />
                ))}
              </div>
            </aside>
            <div className="rounded-[18px] border border-[#eceff4] bg-white px-4 py-2 sm:px-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`faq-row-skeleton-${index}`}
                  className={`py-5 ${index !== 4 ? 'border-b border-[#eceff4]' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-8 w-[85%]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
