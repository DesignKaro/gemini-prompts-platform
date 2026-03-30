import Link from 'next/link';

type ExclusiveAccessCardProps = {
  contentLabel: string;
  isSignedIn: boolean;
  className?: string;
};

export function ExclusiveAccessCard({
  contentLabel,
  isSignedIn,
  className,
}: ExclusiveAccessCardProps) {
  return (
    <section
      className={`rounded-[22px] border border-[#e7e9ee] bg-[#ffffff] p-5 sm:p-6 ${className ?? ''}`.trim()}
    >
      <span className="inline-flex rounded-full border border-[#e2e5eb] bg-[#f8f9fc] px-3 py-1 text-[0.74rem] font-medium uppercase tracking-[0.14em] text-[#3f495a]">
        Members only
      </span>
      <h2 className="mt-3 text-[1.45rem] font-medium tracking-[-0.02em] text-[#121826] sm:text-[1.7rem]">
        Unlock the full {contentLabel}
      </h2>
      <p className="mt-2.5 max-w-[34rem] text-[0.95rem] leading-[1.7] text-[#5d6676]">
        This page is part of the premium library. Upgrade to open the full content, copy the full
        material, and join the discussion.
      </p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link
          href="/membership"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#111111] px-4 text-[0.9rem] font-medium text-white transition-colors hover:bg-black"
        >
          Unlock Exclusive
        </Link>
        <Link
          href={isSignedIn ? '/profile' : '/'}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8dde6] bg-white px-4 text-[0.9rem] font-medium text-[#151a24] transition-colors hover:border-[#111111]"
        >
          {isSignedIn ? 'Go to profile' : 'Back home'}
        </Link>
      </div>
    </section>
  );
}
