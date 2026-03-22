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
      className={`rounded-[26px] border border-[#dbe3bf] bg-[linear-gradient(135deg,#f7fbdf_0%,#ffffff_55%,#eef5c7_100%)] p-6 sm:p-7 ${className ?? ''}`.trim()}
    >
      <span className="inline-flex rounded-full bg-[#111111] px-3.5 py-1.5 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-white">
        Members only
      </span>
      <h2 className="mt-4 text-[1.7rem] font-medium tracking-[-0.03em] text-[#0f1116] sm:text-[2rem]">
        Unlock the full {contentLabel}
      </h2>
      <p className="mt-3 max-w-[40rem] text-[1rem] leading-[1.8] text-[#4b5563]">
        This page is part of the premium library. Upgrade to open the full content, copy the
        full material, and join the discussion.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/membership"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-black"
        >
          View membership
        </Link>
        <Link
          href={isSignedIn ? '/profile' : '/'}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfd7b1] bg-white px-5 text-[0.95rem] font-medium text-[#111111] transition-colors hover:border-[#111111]"
        >
          {isSignedIn ? 'Go to profile' : 'Back home'}
        </Link>
      </div>
    </section>
  );
}
