import Link from 'next/link';
import { PromptImageSlider } from './prompt-image-slider';

type PromptContentSectionProps = {
  title: string;
  promptImageSlides: string[];
  isLocked: boolean;
  isSignedIn: boolean;
  hasHtmlContent: boolean;
  promptText: string;
  promptContent?: string | null;
};

type LockedPromptTeaserProps = {
  isSignedIn: boolean;
};

function LockedPromptTeaser({ isSignedIn }: LockedPromptTeaserProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-[22px] border border-[#dbe4b8] bg-[linear-gradient(135deg,#f7fbdf_0%,#ffffff_55%,#eef5c7_100%)] p-6 sm:p-7">
      <span className="inline-flex rounded-full bg-[#d5ea52] px-3 py-1.5 text-[0.74rem] font-medium uppercase tracking-[0.12em] text-black">
        Exclusive content
      </span>
      <h3 className="mt-4 text-[1.22rem] font-medium tracking-[-0.02em] text-[#0f1116] sm:text-[1.35rem]">
        Full prompt is locked for members
      </h3>
      <p className="mt-2 max-w-[40rem] text-[0.96rem] leading-[1.8] text-[#4b5563]">
        Upgrade your account to unlock full prompt instructions, complete templates, and copy-ready
        formatting.
      </p>

      <div
        aria-hidden="true"
        data-testid="locked-prompt-teaser"
        className="mt-5 space-y-3 rounded-[16px] border border-[#d5debf] bg-white/70 p-4 blur-[4px] select-none"
      >
        <div className="h-3.5 w-[92%] rounded-full bg-[#cfd7b7]" />
        <div className="h-3.5 w-[84%] rounded-full bg-[#cfd7b7]" />
        <div className="h-3.5 w-[90%] rounded-full bg-[#cfd7b7]" />
        <div className="h-3.5 w-[68%] rounded-full bg-[#cfd7b7]" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/membership"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#d5ea52] px-5 text-[0.92rem] font-medium text-black transition-colors hover:bg-[#c5db42]"
        >
          Unlock Exclusive
        </Link>
        <Link
          href={isSignedIn ? '/profile' : '/'}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#cfd7b1] bg-white px-5 text-[0.92rem] font-medium text-[#111111] transition-colors hover:border-[#111111]"
        >
          {isSignedIn ? 'Go to profile' : 'Back home'}
        </Link>
      </div>
    </div>
  );
}

export function PromptContentSection({
  title,
  promptImageSlides,
  isLocked,
  isSignedIn,
  hasHtmlContent,
  promptText,
  promptContent,
}: PromptContentSectionProps) {
  return (
    <>
      {promptImageSlides.length > 0 ? (
        <PromptImageSlider title={title} images={promptImageSlides} />
      ) : null}

      <section className="scroll-mt-24">
        <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">Prompt</h2>
        <p className="mt-4 text-[1.02rem] leading-[1.85] text-[#3f4550]">
          Copy it directly or customize the placeholders before sending it to your model.
        </p>

        {isLocked ? (
          <LockedPromptTeaser isSignedIn={isSignedIn} />
        ) : hasHtmlContent ? (
          <div
            className="prose prose-gray mt-6 max-w-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: promptContent || '' }}
          />
        ) : (
          <pre className="mt-6 overflow-x-auto rounded-[18px] bg-[#0b0f18] p-5 text-[0.92rem] leading-[1.7] text-[#f8fafc]">
            <code>{promptText}</code>
          </pre>
        )}
      </section>
    </>
  );
}
