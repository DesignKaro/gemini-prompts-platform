'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FiChevronRight, FiHelpCircle, FiSearch } from 'react-icons/fi';

type HelpArticle = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
};

type HelpHeader = {
  title: string;
  description: string;
};

const HELP_HEADER: HelpHeader = {
  title: 'Help Center',
  description: 'Find quick answers, guides, and support resources for Gemini Prompts.',
};

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting started with Gemini Prompts',
    subtitle: 'How to browse, save, and use prompts effectively.',
    href: '/prompts',
  },
  {
    id: 'membership-billing',
    title: 'Membership and billing help',
    subtitle: 'Understand plans, upgrades, and subscription management.',
    href: '/membership',
  },
  {
    id: 'account-profile',
    title: 'Manage your account and profile',
    subtitle: 'Update your profile, saved prompts, and activity settings.',
    href: '/profile',
  },
  {
    id: 'contact-support',
    title: 'Contact support',
    subtitle: 'Reach our team for help with technical or account issues.',
    href: '/contact',
  },
  {
    id: 'creator-guidelines',
    title: 'Creator and content guidelines',
    subtitle: 'Best practices for publishing and maintaining quality prompts.',
  },
  {
    id: 'security-privacy',
    title: 'Security and privacy overview',
    subtitle: 'How account and usage data are handled and protected.',
    href: '/privacy-policy',
  },
  {
    id: 'refund-policy',
    title: 'Refund and return policy',
    subtitle: 'Details about billing disputes and refund eligibility.',
    href: '/refund-and-return-policy',
  },
  {
    id: 'community-conduct',
    title: 'Community code of conduct',
    subtitle: 'Rules and behavior standards for contributors and members.',
    href: '/code-of-conduct',
  },
];

export function HelpCenterClient() {
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) return HELP_ARTICLES;

    return HELP_ARTICLES.filter((article) => {
      const haystack = `${article.title} ${article.subtitle ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  return (
    <div className="page-container-wide max-w-[1120px]">
      <section className="rounded-[22px] border border-[#e7eaf0] bg-white p-4 shadow-[0_18px_44px_rgba(19,24,32,0.07)] sm:rounded-[28px] sm:p-7 lg:p-8">
        <div>
          <label
            htmlFor="help-search"
            className="flex items-center gap-3 border-b border-[#111111]/45 pb-3 text-[#202734]"
          >
            <FiSearch className="h-5 w-5 shrink-0 text-[#4a5363]" />
            <span className="sr-only">Search help articles</span>
            <input
              id="help-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for articles..."
              className="w-full border-none bg-transparent text-[1rem] text-[#10151f] outline-none placeholder:text-[#606877] sm:text-[1.12rem]"
            />
          </label>
        </div>

        <div className="mt-7 text-[0.9rem] text-[#6a7280] sm:mt-10 sm:text-[0.95rem]">
          <span className="font-medium text-[#3b4250]">All articles</span>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] bg-[#0f1116] text-white sm:h-[84px] sm:w-[84px]">
            <FiHelpCircle className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[1.55rem] leading-[1.06] tracking-[-0.03em] text-[#10151f] sm:text-[2.3rem]">
              {HELP_HEADER.title}
            </h1>
            <p className="mt-2 max-w-[44rem] text-[0.94rem] leading-6 text-[#677080] sm:text-[1rem] sm:leading-7">
              {HELP_HEADER.description}
            </p>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-[14px] border border-[#dfe3ea] sm:mt-10 sm:rounded-[18px]">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article, index) => {
              const rowClassName = `group flex w-full items-start justify-between gap-3 px-3.5 py-3.5 text-left transition-colors sm:items-center sm:gap-4 sm:px-6 sm:py-5 ${
                index !== filteredArticles.length - 1 ? 'border-b border-[#e6eaf1]' : ''
              }`;

              const content = (
                <>
                  <div className="min-w-0">
                    <p className="text-[0.96rem] leading-[1.4] text-[#171c27] sm:text-[1.08rem]">
                      {article.title}
                    </p>
                    {article.subtitle ? (
                      <p className="mt-1 text-[0.84rem] leading-5 text-[#6a7280] sm:text-[0.92rem] sm:leading-6">
                        {article.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <FiChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[#6d7685] transition-transform duration-200 group-hover:translate-x-0.5 sm:mt-0" />
                </>
              );

              if (article.href) {
                return (
                  <Link
                    key={article.id}
                    href={article.href}
                    className={`${rowClassName} hover:bg-[#f8f9fb] focus-visible:bg-[#f8f9fb] focus-visible:outline-none`}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={article.id}
                  className={`${rowClassName} cursor-not-allowed bg-[#fbfcfe] opacity-75`}
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center sm:px-6">
              <p className="text-[1rem] text-[#596273]">No articles found for "{query.trim()}".</p>
              <p className="mt-1 text-[0.9rem] text-[#7a8291]">Try a different keyword.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
