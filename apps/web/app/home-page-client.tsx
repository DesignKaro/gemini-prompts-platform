'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import ctaRobo from '../Assets/Page/cta-robo.png';
import { AuthorAvatar } from './components/author-avatar';
import { PostCardUI } from './components/post-card';
import { PromptCardUI } from './components/prompt-listing';
import { usePromptInteractions } from './components/prompt-interactions/use-prompt-interactions';
import { Skeleton } from './components/ui/skeleton';
import { useDragSlider } from '../hooks/useDragSlider';
import {
  AuthorApiError,
  fetchFollowedAuthors,
  type FollowedAuthorSummary,
} from '../lib/author-follow';
import {
  estimateReadTime,
  formatDisplayDate,
  getAuthorList,
  getHomeContent,
  getPromptCategoryName,
  getPromptList,
  type ListResponse,
  type HomeResponse,
  type PublicAuthor,
  type PublicPrompt,
} from '../lib/public-content';
import { refreshSession } from '../lib/utils/session';

const heroCards = [
  {
    src: 'https://images.unsplash.com/photo-1547750588-51ce0c34f651?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Colorful poster collage by Jon Tyson on Unsplash',
    height: 286,
    stackRotate: -6,
    stackX: -18,
    stackY: 28,
    width: 246,
    x: -468,
    y: -16,
    zIndex: 1,
    rotate: -13,
  },
  {
    src: 'https://images.unsplash.com/photo-1769421573800-5748940c2cb2?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Colorful collage with pencils by Elena Mozhvilo on Unsplash',
    height: 300,
    stackRotate: -4,
    stackX: -10,
    stackY: 18,
    width: 250,
    x: -312,
    y: -72,
    zIndex: 2,
    rotate: -8,
  },
  {
    src: 'https://images.unsplash.com/photo-1754934302867-2e096e80fc68?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Abstract colorful shapes by Fons Heijnsbroek on Unsplash',
    height: 282,
    stackRotate: -2,
    stackX: -4,
    stackY: 10,
    width: 236,
    x: -156,
    y: -24,
    zIndex: 3,
    rotate: -2,
  },
  {
    src: 'https://images.unsplash.com/photo-1747948908400-fac8c50b2ac0?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Swirling colorful abstract art by Logan Voss on Unsplash',
    height: 276,
    stackRotate: 0,
    stackX: 0,
    stackY: 0,
    width: 228,
    x: 0,
    y: -42,
    zIndex: 7,
    rotate: 0,
  },
  {
    src: 'https://images.unsplash.com/photo-1767036840849-4e8f68fa58ad?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Woman in red hat portrait by sammy swae on Unsplash',
    height: 286,
    stackRotate: 2,
    stackX: 6,
    stackY: 10,
    width: 242,
    x: 152,
    y: -34,
    zIndex: 5,
    rotate: 4,
  },
  {
    src: 'https://images.unsplash.com/photo-1770198809758-f29e74422507?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Collage with colorful shapes by Marija Zaric on Unsplash',
    height: 294,
    stackRotate: 4,
    stackX: 14,
    stackY: 18,
    width: 248,
    x: 320,
    y: -24,
    zIndex: 4,
    rotate: 7,
  },
  {
    src: 'https://images.unsplash.com/photo-1515405295579-ba7b45403062?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200',
    alt: 'Graphic green poster art by Mikhail Nilov on Unsplash',
    height: 288,
    stackRotate: 6,
    stackX: 20,
    stackY: 28,
    width: 250,
    x: 484,
    y: -8,
    zIndex: 1,
    rotate: 12,
  },
];

const floatingBadges = [
  {
    label: '@promptlab',
    className: 'left-[14%] top-[36px] bg-[#3866f3] text-white',
    delay: '520ms',
  },
  {
    label: '@curated',
    className: 'left-1/2 top-[18px] -translate-x-1/2 bg-[#f2a8c8] text-white',
    delay: '570ms',
  },
  {
    label: '@andrea',
    className: 'right-[11%] top-[64px] bg-[#86cfb1] text-white',
    delay: '620ms',
  },
];

const categorySkeletonCount = 8;
const authorSkeletonCount = 8;
const trendingPromptSkeletonCount = 4;
const followedPromptInitialTake = 8;
const followedPromptLoadMoreTake = 4;
const followedPromptSkeletonCount = 4;
const watchReadListenInitialTake = 8;
const watchReadListenLoadMoreTake = 4;
const watchReadListenSkeletonCount = 4;
const recentPostsSkeletonCount = 4;
const watchReadListenImageFallback =
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200';

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isAccessTokenExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= Date.now() + 60_000;
}

const whyChooseItems = [
  {
    title: 'Unrivaled Quality',
    description:
      'Every featured prompt is reviewed for usefulness, originality, and real-world creator value. You get a cleaner library filled with ideas that are ready to use.',
  },
  {
    title: 'Fast creator workflow',
    description:
      'Discover prompt packs, save references, and move from inspiration to launch without losing momentum. Everything is organized to help you find strong ideas in less time.',
  },
  {
    title: 'Unrivaled Variety',
    description:
      'We offer strong value across image, code, and content prompts for every type of builder. That means one library can support your visuals, product work, and storytelling.',
  },
  {
    title: 'Legacy of Excellence',
    description:
      'The collection is curated to feel timeless, useful, and consistently high-signal instead of trend-chasing. You can keep returning to proven prompts that still hold up over time.',
  },
];

const benefitCards = [
  {
    title: '100% Authentic Product',
    description:
      'Prominently display a clear "100% authentic guarantee" so every buyer feels immediate trust.',
    tone: 'bg-[#fff0e6]',
  },
  {
    title: 'Free & Easy Return',
    description:
      'Provide customers with prepaid return labels to make the process hassle-free and friendly.',
    tone: 'bg-[#f3f3f1]',
  },
  {
    title: 'Safe Payments',
    description:
      'Use fraud detection tools to identify suspicious activity and protect every order with confidence.',
    tone: 'bg-[#f3f3f1]',
  },
];

const testimonials = [
  {
    quote:
      'Gemini Prompts helped me ship campaign drafts in hours instead of days. The prompt quality is consistent and genuinely useful.',
    name: 'Kyle Weznick',
    role: 'Media Director, Turn Around Music Group',
    avatar:
      'url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=300)',
  },
  {
    quote:
      'I use it every morning to unblock writing tasks. The structure of each prompt gives me a reliable starting point every time.',
    name: 'Nina Alvarez',
    role: 'Content Lead, Studio North',
    avatar:
      'url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=300)',
  },
  {
    quote:
      'Our design team now explores twice as many directions before review. It feels like having a creative strategist built into our workflow.',
    name: 'Rohan Mehta',
    role: 'Product Designer, Pixel Forge',
    avatar:
      'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=300)',
  },
  {
    quote:
      'The code prompt packs are practical, not fluff. They helped our team tighten specs, debug faster, and improve handoffs.',
    name: 'Elena Brooks',
    role: 'Engineering Manager, Buildlane',
    avatar:
      'url(https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=300)',
  },
  {
    quote:
      'I joined for content ideas and stayed for the curation quality. Everything feels polished, relevant, and ready to adapt.',
    name: 'Marcus Lee',
    role: 'Growth Marketer, Brightbit',
    avatar:
      'url(https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=300)',
  },
  {
    quote:
      'This library gave our small team enterprise-level creative momentum. We launch faster now without sacrificing quality.',
    name: 'Priya Nair',
    role: 'Founder, Orbit Atelier',
    avatar:
      'url(https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=300)',
  },
];

const communityCardSize = 'h-[80px] w-[80px] sm:h-[96px] sm:w-[96px]';

const communityTopCards = [
  {
    src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait with warm lighting',
  },
  {
    src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Creative portrait with neutral tone',
  },
  {
    src: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Model in streetwear look',
  },
  {
    src: 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Vibrant close-up portrait',
  },
  {
    src: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Creative profile shot',
  },
  {
    src: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Bold fashion portrait',
  },
  {
    src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Stylish studio portrait',
  },
  {
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Smiling portrait with soft tones',
  },
  {
    src: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait in editorial style',
  },
  {
    src: 'https://images.unsplash.com/photo-1545996124-0501ebae84d0?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Street portrait with bright colors',
  },
];

const communityBottomCards = [
  {
    src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait with cinematic lighting',
  },
  {
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait with bright expression',
  },
  {
    src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Casual portrait closeup',
  },
  {
    src: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Urban portrait look',
  },
  {
    src: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Creative portrait with gradient tones',
  },
  {
    src: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Fashion portrait with deep colors',
  },
  {
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait with warm highlights',
  },
  {
    src: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Profile portrait in dark tones',
  },
  {
    src: 'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait with artistic mood',
  },
  {
    src: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=280',
    alt: 'Portrait with expressive styling',
  },
];

const homeFaqCategories = ['General', 'Trust & Safety', 'Services', 'Billing', 'Office Cleaning'];

const faqItems = [
  {
    answer:
      'After renovation, we recommend a deep clean booking so dust and debris are removed from vents, surfaces, and corners before your regular cleaning cycle starts.',
    category: 'General',
    id: 'renovation-work',
    question: 'What if I just had renovation work done?',
  },
  {
    answer:
      'You can book in just a few minutes from the website. Pick your service, choose a time slot, add any notes, and confirm your details before checkout.',
    category: 'General',
    id: 'book-appointment',
    question: 'How do I book an appointment online?',
  },
  {
    answer:
      'Yes. You can reschedule or cancel from your account dashboard as long as you do so before the cutoff window shown in your booking confirmation.',
    category: 'General',
    id: 'reschedule-cancel',
    question: 'Can I reschedule or cancel my booking?',
  },
  {
    answer:
      'We serve most neighborhoods in our listed service areas. Enter your address at checkout and we will instantly confirm whether service is available.',
    category: 'General',
    id: 'service-area',
    question: 'How do I know if you service my area?',
  },
  {
    answer:
      'Most standard appointments run between 2 and 4 hours depending on your space size, selected service type, and any extras you include.',
    category: 'General',
    id: 'appointment-length',
    question: 'How long does a typical appointment take?',
  },
  {
    answer:
      'Yes. Frequent customers receive loyalty pricing and occasional bundle discounts, which you can view during checkout before confirming your appointment.',
    category: 'Billing',
    id: 'frequent-customer-discount',
    question: "Do I get a discount if I'm a frequent customer?",
  },
  {
    answer:
      'We accept all major credit and debit cards, and in some areas we also support Apple Pay and Google Pay for faster checkout.',
    category: 'Billing',
    id: 'payment-methods',
    question: 'What payment methods do you accept?',
  },
  {
    answer:
      'You are charged only after your booking is confirmed. Recurring plans are billed according to the schedule you choose during signup.',
    category: 'Billing',
    id: 'when-charged',
    question: 'When will I be charged for my booking?',
  },
  {
    answer:
      'Yes. Invoices and payment receipts are available from your account dashboard, and we also email a copy after every completed service.',
    category: 'Billing',
    id: 'invoice-receipt',
    question: 'Can I get an invoice or receipt after service?',
  },
  {
    answer:
      'If something does not look right, contact support and we will review the charge, explain the line items, and correct any verified billing issue.',
    category: 'Billing',
    id: 'billing-issue',
    question: 'What should I do if I notice a billing issue?',
  },
  {
    answer:
      'Absolutely. You can leave detailed notes while booking, and you can also update special requests from your dashboard before your cleaner arrives.',
    category: 'Services',
    id: 'special-instructions',
    question: 'Can I give specific instructions to the cleaners and ask for special requests?',
  },
  {
    answer:
      'No worries. Cleaners can bring standard supplies when requested. If you want eco-friendly products, select that preference during booking.',
    category: 'Services',
    id: 'supplies-needed',
    question: "What if I don't have a mop, bucket, or vacuum?",
  },
  {
    answer:
      'Yes. Deep cleaning, move-in and move-out cleaning, and add-on services can be selected during checkout so your appointment fits your exact needs.',
    category: 'Services',
    id: 'deep-cleaning-options',
    question: 'Do you offer deep cleaning or specialty cleaning services?',
  },
  {
    answer:
      'If you have a strong preference, we do our best to match you with the same cleaner for recurring bookings depending on availability.',
    category: 'Services',
    id: 'same-cleaner',
    question: 'Can I request the same cleaner for recurring visits?',
  },
  {
    answer:
      'Yes. Add-on tasks like inside-fridge cleaning, inside-oven cleaning, or laundry folding can be selected before you confirm your appointment.',
    category: 'Services',
    id: 'add-on-tasks',
    question: 'Can I add extra tasks to my service?',
  },
  {
    answer:
      'Yes, we provide office and commercial cleaning with flexible schedules, including after-hours service to avoid disrupting your operations.',
    category: 'Office Cleaning',
    id: 'office-cleaning',
    question: 'Do you clean offices and other commercial spaces?',
  },
  {
    answer:
      'Yes. We can arrange evening, early morning, or weekend service windows so your team can work without interruptions.',
    category: 'Office Cleaning',
    id: 'after-hours-office',
    question: 'Can office cleanings be scheduled outside business hours?',
  },
  {
    answer:
      'We clean workstations, meeting rooms, kitchens, restrooms, lobbies, and other shared areas, with custom checklists available for each site.',
    category: 'Office Cleaning',
    id: 'office-areas-covered',
    question: 'What areas are included in office cleaning?',
  },
  {
    answer:
      'Absolutely. We support weekly, biweekly, and custom recurring schedules for office clients, including multi-location coordination.',
    category: 'Office Cleaning',
    id: 'recurring-office',
    question: 'Do you offer recurring office cleaning plans?',
  },
  {
    answer:
      'Yes. We can work around access rules, badge entry, security desks, and site-specific instructions to keep everything seamless for your team.',
    category: 'Office Cleaning',
    id: 'building-access',
    question: 'Can you handle office building access and security requirements?',
  },
  {
    answer:
      'Every cleaner is background-checked and identity-verified. We also monitor reviews and maintain strict quality standards for ongoing bookings.',
    category: 'Trust & Safety',
    id: 'trust-safety',
    question: 'How do you ensure cleaners are trustworthy and professional?',
  },
  {
    answer:
      'Yes. Our teams are insured, and we have clear incident reporting processes in place to protect both customers and professionals.',
    category: 'Trust & Safety',
    id: 'insured-teams',
    question: 'Are your cleaners insured and covered while on the job?',
  },
  {
    answer:
      'We review every issue seriously. If something is damaged or missed, contact support promptly and we will guide you through the resolution process.',
    category: 'Trust & Safety',
    id: 'damage-resolution',
    question: 'What happens if something is damaged during service?',
  },
  {
    answer:
      'We use secure payment processing and protect your account details with industry-standard safeguards. Sensitive payment data is never exposed to cleaners.',
    category: 'Trust & Safety',
    id: 'payment-security',
    question: 'How do you keep my payment and account information secure?',
  },
  {
    answer:
      'Yes. You can review cleaner ratings, completed jobs, and service history from your account to feel confident before ongoing bookings.',
    category: 'Trust & Safety',
    id: 'review-cleaner-history',
    question: 'Can I see ratings or service history for cleaners?',
  },
];

type WatchReadListenCardViewModel = {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  image: string;
  tags: string[];
  likes: number;
  comments: number;
  duration: string;
};

function toWatchReadListenCard(prompt: PublicPrompt): WatchReadListenCardViewModel {
  const tags = prompt.tags.slice(0, 2).map((tag) => tag.name);
  const resolvedTags = tags.length > 0 ? tags : [getPromptCategoryName(prompt)];
  const readTime = estimateReadTime(prompt.description);

  return {
    id: prompt.id,
    slug: prompt.slug,
    title: prompt.title,
    author: prompt.author.name,
    date: formatDisplayDate(prompt.publishedAt || prompt.updatedAt),
    image: prompt.image || watchReadListenImageFallback,
    tags: resolvedTags,
    likes: prompt.likeCount,
    comments: prompt.commentCount,
    duration: readTime || '1 min read',
  };
}

function WatchReadListenPromptCard({ prompt }: { prompt: PublicPrompt }) {
  const card = useMemo(() => toWatchReadListenCard(prompt), [prompt]);
  const {
    likeCount,
    commentCount,
    likedByIp,
    savedByUser,
    likePending,
    savePending,
    likePrompt,
    toggleSavePrompt,
  } = usePromptInteractions({
    promptId: prompt.id,
    initialLikeCount: card.likes,
    initialSaveCount: prompt.saveCount,
    initialCommentCount: card.comments,
    syncAnonymousStatus: true,
  });

  return (
    <article className="group relative rounded-[20px] border border-[#dfe2e8] bg-white p-4 sm:p-5 lg:p-6">
      <Link
        href={`/prompt/${card.slug}`}
        aria-label={`Open prompt: ${card.title}`}
        className="absolute inset-0 z-10 rounded-[20px]"
      />

      <div className="pointer-events-none relative z-20 grid gap-4 sm:grid-cols-[1fr_220px] sm:items-stretch">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {card.tags.map((tag) => (
              <span
                key={`${card.id}-${tag}`}
                className="rounded-full bg-[#d5ea52] px-3 py-1.5 text-[0.92rem] leading-none text-[#161a22]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3 className="mt-4 text-[1.28rem] leading-[1.3] tracking-[-0.02em] text-[#101217] sm:text-[1.38rem]">
            {card.title}
          </h3>

          <div className="mt-4 flex items-center gap-2 text-[#6d7585]">
            <p className="text-[0.95rem] leading-none text-[#12151d]">{card.author}</p>
            <span aria-hidden="true" className="text-[0.95rem] leading-none">•</span>
            <p className="text-[0.9rem] leading-none">{card.date}</p>
          </div>

          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[#131823]">
                <button
                  type="button"
                  onClick={() => void likePrompt()}
                  disabled={likedByIp || likePending}
                  aria-label={likedByIp ? 'Liked' : 'Like prompt'}
                  className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-[#4b5568] transition-colors ${
                    likedByIp
                      ? 'bg-[#ffecef] text-[#e11d48] hover:bg-[#ffdfe5]'
                      : 'bg-[#f1f3f6] hover:bg-[#e8ecf2]'
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M12 20.2S4.5 15.6 4.5 10.2a4.2 4.2 0 0 1 7.2-3 4.2 4.2 0 0 1 7.2 3c0 5.4-7.5 10-7.5 10Z"
                      fill={likedByIp ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
                <span className="text-[1.02rem] leading-none">{likeCount}</span>
              </div>

              <div className="flex items-center gap-2 text-[#131823]">
                <Link
                  href={`/prompt/${card.slug}#comments`}
                  aria-label={`Open comments for ${card.title}`}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3f6] text-[#4b5568] transition-colors hover:bg-[#e8ecf2]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M6.8 6.8h10.4a2.6 2.6 0 0 1 2.6 2.6v5.3a2.6 2.6 0 0 1-2.6 2.6h-5.1L8 20v-2.7H6.8a2.6 2.6 0 0 1-2.6-2.6V9.4a2.6 2.6 0 0 1 2.6-2.6Z"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M9.1 11.1h5.8M9.1 14h3.3"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </Link>
                <span className="text-[1.02rem] leading-none">{commentCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[#3d485d]">
              <span className="text-[1rem] leading-none">{card.duration}</span>
              <button
                type="button"
                onClick={() => void toggleSavePrompt()}
                disabled={savePending}
                aria-label={savedByUser ? 'Unsave prompt' : 'Save prompt'}
                aria-pressed={savedByUser}
                className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  savedByUser
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#f1f3f6] text-[#4b5568] hover:bg-[#e8ecf2]'
                } disabled:cursor-not-allowed disabled:opacity-80`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M7.6 4.8h8.8a1.6 1.6 0 0 1 1.6 1.6v12.8L12 15.8l-6 3.4V6.4a1.6 1.6 0 0 1 1.6-1.6Z"
                    fill={savedByUser ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div
          className="relative min-h-[170px] overflow-hidden rounded-[20px] bg-cover bg-center"
          style={{ backgroundImage: `url(${card.image})` }}
        />
      </div>
    </article>
  );
}

type HomePageClientProps = {
  initialHomeContent: HomeResponse | null;
  initialLatestPrompts: ListResponse<PublicPrompt> | null;
  initialTrendingAuthors: ListResponse<PublicAuthor> | null;
};

export default function HomePageClient({
  initialHomeContent,
  initialLatestPrompts,
  initialTrendingAuthors,
}: HomePageClientProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const { sliderRef: categorySliderRef, dragHandlers: categoryDragHandlers } = useDragSlider();
  const { sliderRef: trendingAuthorsSliderRef, dragHandlers: trendingAuthorsDragHandlers } =
    useDragSlider();
  const { sliderRef: recentlyUploadedSliderRef, dragHandlers: recentlyUploadedDragHandlers } = useDragSlider();
  const { data: session, status: sessionStatus, update } = useSession();
  const followedAuthorsRequestRef = useRef(0);
  const followedPromptsRequestRef = useRef(0);
  const watchReadListenRequestRef = useRef(0);
  const carouselCards = [...heroCards, ...heroCards];
  const desktopCardHeight = 340;
  const mobileCardHeight = 190;
  const [openWhyChoose, setOpenWhyChoose] = useState(whyChooseItems[0]?.title ?? '');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeFaqCategory, setActiveFaqCategory] = useState(homeFaqCategories[0] ?? 'General');
  const [openFaqId, setOpenFaqId] = useState(
    faqItems.find((item) => item.category === (homeFaqCategories[0] ?? 'General'))?.id ?? '',
  );
  const [homeContent, setHomeContent] = useState<HomeResponse | null>(initialHomeContent);
  const [isHomeContentLoading, setIsHomeContentLoading] = useState(!initialHomeContent);
  const [homeContentLoadError, setHomeContentLoadError] = useState<string | null>(null);
  const [watchReadListenPrompts, setWatchReadListenPrompts] = useState<PublicPrompt[]>(
    initialLatestPrompts?.items ?? [],
  );
  const [isWatchReadListenLoadingInitial, setIsWatchReadListenLoadingInitial] = useState(
    !initialLatestPrompts,
  );
  const [isWatchReadListenLoadingMore, setIsWatchReadListenLoadingMore] = useState(false);
  const [watchReadListenHasMore, setWatchReadListenHasMore] = useState(
    initialLatestPrompts
      ? initialLatestPrompts.items.length === watchReadListenInitialTake &&
          initialLatestPrompts.items.length < initialLatestPrompts.total
      : true,
  );
  const [watchReadListenLoadError, setWatchReadListenLoadError] = useState<string | null>(null);
  const [watchReadListenLoadMoreError, setWatchReadListenLoadMoreError] = useState<string | null>(null);
  const [trendingAuthors, setTrendingAuthors] = useState<PublicAuthor[]>(
    initialTrendingAuthors?.items ?? [],
  );
  const [isTrendingAuthorsLoading, setIsTrendingAuthorsLoading] = useState(
    !initialTrendingAuthors,
  );
  const [trendingAuthorsLoadError, setTrendingAuthorsLoadError] = useState<string | null>(null);
  const [followedAuthors, setFollowedAuthors] = useState<FollowedAuthorSummary[]>([]);
  const [selectedFollowedAuthorIds, setSelectedFollowedAuthorIds] = useState<string[]>([]);
  const [followedPromptItems, setFollowedPromptItems] = useState<PublicPrompt[]>([]);
  const [followedPromptTotal, setFollowedPromptTotal] = useState(0);
  const [isFollowedAuthorsLoading, setIsFollowedAuthorsLoading] = useState(false);
  const [isFollowedPromptsLoading, setIsFollowedPromptsLoading] = useState(false);
  const [isFollowedPromptsLoadingMore, setIsFollowedPromptsLoadingMore] = useState(false);
  const [followedAuthorsError, setFollowedAuthorsError] = useState<string | null>(null);
  const [followedPromptsError, setFollowedPromptsError] = useState<string | null>(null);
  const [followedPromptsLoadMoreError, setFollowedPromptsLoadMoreError] = useState<string | null>(null);
  const totalTestimonials = testimonials.length;
  const currentTestimonial = testimonials[activeTestimonial] ?? testimonials[0]!;
  const visibleFaqItems = faqItems.filter((item) => item.category === activeFaqCategory);
  const displayTrendingCategories =
    homeContent?.categories?.map((category) => ({
      slug: category.slug,
      title: category.name,
      articles: category.totalCount,
      image:
        category.imageUrl ||
        'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=900',
    })) ?? [];
  const displayTrendingPrompts = homeContent?.trendingPrompts ?? [];
  const displayTrendingAuthors = trendingAuthors.map((author) => ({
    id: author.id,
    slug: author.slug,
    title: author.name,
    avatarUrl: author.avatarUrl,
    avatarUpdatedAt: author.avatarUpdatedAt,
    articles:
      author.totalCount ?? (author.promptCount ?? 0) + (author.postCount ?? 0),
  }));
  const displayRecentPosts =
    homeContent?.latestPosts?.map((post) => ({
      title: post.title,
      image:
        post.image ||
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1100',
      readTime: estimateReadTime(post.excerpt || post.content),
      slug: post.slug,
    })) ?? [];
  const displayPopularTags = homeContent?.popularTags ?? [];
  const selectedFollowedAuthorIdSet = useMemo(
    () => new Set(selectedFollowedAuthorIds),
    [selectedFollowedAuthorIds],
  );
  const selectedFollowedAuthorOrder = useMemo(
    () =>
      followedAuthors
        .filter((author) => selectedFollowedAuthorIdSet.has(author.id))
        .map((author) => author.id),
    [followedAuthors, selectedFollowedAuthorIdSet],
  );
  const followedAuthorMap = useMemo(
    () => new Map(followedAuthors.map((author) => [author.id, author])),
    [followedAuthors],
  );
  const groupedFollowedPrompts = useMemo(
    () =>
      selectedFollowedAuthorOrder
        .map((authorId) => ({
          author: followedAuthorMap.get(authorId) ?? null,
          prompts: followedPromptItems.filter((prompt) => prompt.author.id === authorId),
        }))
        .filter((group) => Boolean(group.author) && group.prompts.length > 0),
    [followedAuthorMap, followedPromptItems, selectedFollowedAuthorOrder],
  );
  const followedPromptCountByAuthor = useMemo(() => {
    const countMap = new Map<string, number>();
    followedPromptItems.forEach((prompt) => {
      countMap.set(prompt.author.id, (countMap.get(prompt.author.id) ?? 0) + 1);
    });
    return countMap;
  }, [followedPromptItems]);
  const canLoadMoreFollowedPrompts = followedPromptItems.length < followedPromptTotal;
  const shouldShowFollowedAuthorsSection =
    sessionStatus === 'authenticated' &&
    (isFollowedAuthorsLoading || Boolean(followedAuthorsError) || followedAuthors.length > 0);

  const loadHomeContent = useCallback(async () => {
    setIsHomeContentLoading(true);
    setHomeContentLoadError(null);

    try {
      const data = await getHomeContent();
      setHomeContent(data);
    } catch {
      setHomeContent(null);
      setHomeContentLoadError('Could not load homepage content right now.');
    } finally {
      setIsHomeContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialHomeContent) {
      setHomeContentLoadError(null);
      return;
    }

    void loadHomeContent();
  }, [initialHomeContent, loadHomeContent]);

  const loadTrendingAuthors = useCallback(async () => {
    setIsTrendingAuthorsLoading(true);
    setTrendingAuthorsLoadError(null);

    try {
      const response = await getAuthorList({ take: 12, sort: 'popular' });
      setTrendingAuthors(response.items);
    } catch {
      setTrendingAuthors([]);
      setTrendingAuthorsLoadError('Could not load trending authors right now.');
    } finally {
      setIsTrendingAuthorsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTrendingAuthors) {
      setTrendingAuthorsLoadError(null);
      return;
    }

    void loadTrendingAuthors();
  }, [initialTrendingAuthors, loadTrendingAuthors]);

  const loadWatchReadListenPrompts = useCallback(
    async ({
      append,
      skip,
    }: {
      append: boolean;
      skip: number;
    }) => {
      const requestId = ++watchReadListenRequestRef.current;
      const take = append ? watchReadListenLoadMoreTake : watchReadListenInitialTake;

      if (append) {
        setIsWatchReadListenLoadingMore(true);
        setWatchReadListenLoadMoreError(null);
      } else {
        setIsWatchReadListenLoadingInitial(true);
        setWatchReadListenLoadError(null);
        setWatchReadListenLoadMoreError(null);
      }

      try {
        const response = await getPromptList(
          {
            sort: 'latest',
            skip,
            take,
            includeTags: 1,
          },
          { noStore: true },
        );

        if (requestId !== watchReadListenRequestRef.current) return;

        const nextCount = skip + response.items.length;
        const hasMore = response.items.length === take && nextCount < response.total;

        setWatchReadListenHasMore(hasMore);
        setWatchReadListenPrompts((current) =>
          append ? [...current, ...response.items] : response.items,
        );
      } catch {
        if (requestId !== watchReadListenRequestRef.current) return;
        if (append) {
          setWatchReadListenLoadMoreError('Could not load more prompts. Please retry.');
        } else {
          setWatchReadListenLoadError('Could not load latest prompts right now.');
          setWatchReadListenPrompts([]);
          setWatchReadListenHasMore(false);
        }
      } finally {
        if (requestId === watchReadListenRequestRef.current) {
          if (append) {
            setIsWatchReadListenLoadingMore(false);
          } else {
            setIsWatchReadListenLoadingInitial(false);
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (initialLatestPrompts) {
      return;
    }

    void loadWatchReadListenPrompts({ append: false, skip: 0 });
  }, [initialLatestPrompts, loadWatchReadListenPrompts]);

  const getSessionAccessToken = useCallback(async () => {
    let accessToken = session?.apiAccessToken ?? null;
    if (accessToken && !isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
      return accessToken;
    }

    if (update) {
      const refreshed = await refreshSession(update).catch(() => null);
      accessToken = refreshed?.apiAccessToken ?? null;
      if (accessToken) {
        return accessToken;
      }
    }

    return null;
  }, [session?.apiAccessToken, session?.apiAccessTokenExpiresAt, update]);

  const loadFollowedAuthors = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      setFollowedAuthors([]);
      setSelectedFollowedAuthorIds([]);
      setFollowedPromptItems([]);
      setFollowedPromptTotal(0);
      setFollowedAuthorsError(null);
      setFollowedPromptsError(null);
      setFollowedPromptsLoadMoreError(null);
      setIsFollowedAuthorsLoading(false);
      setIsFollowedPromptsLoading(false);
      setIsFollowedPromptsLoadingMore(false);
      return;
    }

    const requestId = ++followedAuthorsRequestRef.current;
    setIsFollowedAuthorsLoading(true);
    setFollowedAuthorsError(null);

    const accessToken = await getSessionAccessToken();
    if (!accessToken) {
      if (requestId !== followedAuthorsRequestRef.current) return;
      setFollowedAuthors([]);
      setSelectedFollowedAuthorIds([]);
      setFollowedPromptItems([]);
      setFollowedPromptTotal(0);
      setIsFollowedAuthorsLoading(false);
      setFollowedAuthorsError('Session expired. Please sign in again to load followed authors.');
      return;
    }

    try {
      const response = await fetchFollowedAuthors(accessToken);
      if (requestId !== followedAuthorsRequestRef.current) return;

      setFollowedAuthors(response.items);
      setSelectedFollowedAuthorIds((current) => {
        const availableIds = new Set(response.items.map((item) => item.id));
        const next = current.filter((id) => availableIds.has(id));
        if (next.length > 0) return next;
        const firstAuthor = response.items[0];
        return firstAuthor ? [firstAuthor.id] : [];
      });

      if (response.items.length === 0) {
        setFollowedPromptItems([]);
        setFollowedPromptTotal(0);
      }
    } catch (error) {
      if (requestId !== followedAuthorsRequestRef.current) return;
      if (error instanceof AuthorApiError && error.status === 401) {
        setFollowedAuthorsError('Session expired. Please sign in again to load followed authors.');
      } else {
        setFollowedAuthorsError('Could not load followed authors right now.');
      }
      setFollowedAuthors([]);
      setSelectedFollowedAuthorIds([]);
      setFollowedPromptItems([]);
      setFollowedPromptTotal(0);
    } finally {
      if (requestId === followedAuthorsRequestRef.current) {
        setIsFollowedAuthorsLoading(false);
      }
    }
  }, [getSessionAccessToken, sessionStatus]);

  const fetchFollowedPromptsPage = useCallback(
    async ({
      append,
      skip,
      take,
    }: {
      append: boolean;
      skip: number;
      take: number;
    }) => {
      if (sessionStatus !== 'authenticated') {
        return;
      }
      if (selectedFollowedAuthorOrder.length === 0) {
        setFollowedPromptItems([]);
        setFollowedPromptTotal(0);
        return;
      }

      const requestId = ++followedPromptsRequestRef.current;
      if (append) {
        setIsFollowedPromptsLoadingMore(true);
        setFollowedPromptsLoadMoreError(null);
      } else {
        setIsFollowedPromptsLoading(true);
        setFollowedPromptsError(null);
        setFollowedPromptsLoadMoreError(null);
      }

      try {
        const response = await getPromptList(
          {
            sort: 'latest',
            authorIds: selectedFollowedAuthorOrder.join(','),
            includeTags: 1,
            skip,
            take,
          },
          { noStore: true },
        );

        if (requestId !== followedPromptsRequestRef.current) return;

        setFollowedPromptTotal(response.total);
        setFollowedPromptItems((current) =>
          append ? [...current, ...response.items] : response.items,
        );
      } catch {
        if (requestId !== followedPromptsRequestRef.current) return;
        if (append) {
          setFollowedPromptsLoadMoreError('Could not load more prompts. Please retry.');
        } else {
          setFollowedPromptsError('Could not load prompts for selected authors.');
          setFollowedPromptItems([]);
          setFollowedPromptTotal(0);
        }
      } finally {
        if (requestId === followedPromptsRequestRef.current) {
          if (append) {
            setIsFollowedPromptsLoadingMore(false);
          } else {
            setIsFollowedPromptsLoading(false);
          }
        }
      }
    },
    [selectedFollowedAuthorOrder, sessionStatus],
  );

  useEffect(() => {
    void loadFollowedAuthors();
  }, [loadFollowedAuthors]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      return;
    }
    if (isFollowedAuthorsLoading || followedAuthorsError) {
      return;
    }
    if (selectedFollowedAuthorOrder.length === 0) {
      setFollowedPromptItems([]);
      setFollowedPromptTotal(0);
      setFollowedPromptsError(null);
      setFollowedPromptsLoadMoreError(null);
      return;
    }

    void fetchFollowedPromptsPage({
      append: false,
      skip: 0,
      take: followedPromptInitialTake,
    });
  }, [
    fetchFollowedPromptsPage,
    followedAuthorsError,
    isFollowedAuthorsLoading,
    selectedFollowedAuthorOrder,
    sessionStatus,
  ]);

  useEffect(() => {
    if (totalTestimonials <= 1) {
      return;
    }

    const autoplayId = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % totalTestimonials);
    }, 4500);

    return () => {
      window.clearInterval(autoplayId);
    };
  }, [totalTestimonials]);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main');
    if (!main) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let observer: IntersectionObserver | null = null;

    const getSections = () =>
      Array.from(main.querySelectorAll<HTMLElement>(':scope > section.reveal-section'));

    const syncRevealTargets = () => {
      const sections = getSections();
      if (sections.length === 0) {
        return;
      }

      sections.forEach((section, index) => {
        section.style.setProperty('--reveal-delay', `${Math.min(index * 80, 320)}ms`);
      });

      if (prefersReducedMotion) {
        sections.forEach((section) => section.classList.add('is-visible'));
        return;
      }

      sections.forEach((section) => {
        if (!section.classList.contains('is-visible')) {
          observer?.observe(section);
        }
      });
    };

    if (!prefersReducedMotion) {
      observer = new IntersectionObserver(
        (entries, currentObserver) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              currentObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.14,
          rootMargin: '0px 0px -10% 0px',
        },
      );
    }

    syncRevealTargets();

    const mutationObserver = new MutationObserver(() => {
      syncRevealTargets();
    });
    mutationObserver.observe(main, { childList: true });

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, [sessionStatus]);

  const goToNextTestimonial = () => {
    if (totalTestimonials <= 1) {
      return;
    }

    setActiveTestimonial((current) => (current + 1) % totalTestimonials);
  };

  const goToPreviousTestimonial = () => {
    if (totalTestimonials <= 1) {
      return;
    }

    setActiveTestimonial((current) => (current - 1 + totalTestimonials) % totalTestimonials);
  };

  const scrollCategories = (direction: 'prev' | 'next') => {
    const slider = categorySliderRef.current;
    if (!slider) {
      return;
    }

    const firstCard = slider.querySelector<HTMLElement>('[data-category-card]');
    const sliderStyles = window.getComputedStyle(slider);
    const gap = Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap || '0');
    const scrollAmount = firstCard
      ? firstCard.offsetWidth + gap
      : Math.round(slider.clientWidth * 0.8);

    slider.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  const scrollRecentlyUploaded = (direction: 'prev' | 'next') => {
    const slider = recentlyUploadedSliderRef.current;
    if (!slider) {
      return;
    }

    const firstCard = slider.querySelector<HTMLElement>('[data-post-card], [data-recent-card]');
    const sliderStyles = window.getComputedStyle(slider);
    const gap = Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap || '0');
    const scrollAmount = firstCard
      ? firstCard.offsetWidth + gap
      : Math.round(slider.clientWidth * 0.86);

    slider.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  const scrollTrendingAuthors = (direction: 'prev' | 'next') => {
    const slider = trendingAuthorsSliderRef.current;
    if (!slider) {
      return;
    }

    const firstCard = slider.querySelector<HTMLElement>('[data-author-card]');
    const sliderStyles = window.getComputedStyle(slider);
    const gap = Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap || '0');
    const scrollAmount = firstCard
      ? firstCard.offsetWidth + gap
      : Math.round(slider.clientWidth * 0.8);

    slider.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  const retryLoadWatchReadListenInitial = () => {
    void loadWatchReadListenPrompts({ append: false, skip: 0 });
  };

  const loadMoreWatchReadListen = () => {
    if (
      isWatchReadListenLoadingInitial ||
      isWatchReadListenLoadingMore ||
      !watchReadListenHasMore
    ) {
      return;
    }

    void loadWatchReadListenPrompts({
      append: true,
      skip: watchReadListenPrompts.length,
    });
  };

  const retryLoadWatchReadListenMore = () => {
    void loadWatchReadListenPrompts({
      append: true,
      skip: watchReadListenPrompts.length,
    });
  };

  const retryLoadHomeContent = () => {
    void loadHomeContent();
  };

  const retryLoadTrendingAuthors = () => {
    void loadTrendingAuthors();
  };

  const toggleFollowedAuthorSelection = (authorId: string) => {
    const firstAuthorId = followedAuthors[0]?.id;
    followedPromptsRequestRef.current += 1;
    setFollowedPromptItems([]);
    setFollowedPromptTotal(0);
    setFollowedPromptsError(null);
    setFollowedPromptsLoadMoreError(null);
    setIsFollowedPromptsLoading(false);
    setIsFollowedPromptsLoadingMore(false);

    setSelectedFollowedAuthorIds((current) => {
      if (current.includes(authorId)) {
        const next = current.filter((id) => id !== authorId);
        if (next.length > 0) {
          return next;
        }
        return firstAuthorId ? [firstAuthorId] : [];
      }
      return [...current, authorId];
    });
  };

  const retryLoadFollowedAuthors = () => {
    void loadFollowedAuthors();
  };

  const retryLoadFollowedPrompts = () => {
    void fetchFollowedPromptsPage({
      append: false,
      skip: 0,
      take: followedPromptInitialTake,
    });
  };

  const loadMoreFollowedPrompts = () => {
    if (isFollowedPromptsLoadingMore || isFollowedPromptsLoading || !canLoadMoreFollowedPrompts) {
      return;
    }

    void fetchFollowedPromptsPage({
      append: true,
      skip: followedPromptItems.length,
      take: followedPromptLoadMoreTake,
    });
  };

  const setFaqCategory = (category: string) => {
    setActiveFaqCategory(category);
    const firstItemInCategory = faqItems.find((item) => item.category === category);
    setOpenFaqId(firstItemInCategory?.id ?? '');
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId((current) => (current === id ? '' : id));
  };

  return (
    <main className="homepage-headings w-full pb-20 pt-4">
      <section
        ref={heroRef}
        className="reveal-section relative overflow-hidden py-10 text-center sm:py-12 lg:py-16"
      >
        <div className="page-container-wide px-4 sm:px-6 lg:px-8">
          <h1 className="hero-copy mx-auto mt-2 max-w-[72rem] text-[3rem] leading-[1.1] tracking-[-0.07em] text-[#111111] sm:text-[4.2rem] lg:text-[5.7rem]">
            <span className="block">A place for prompt</span>
            <span className="block">masterpieces.</span>
          </h1>

          <div className="relative mt-6 h-[220px] w-full sm:h-[430px] lg:mt-8 lg:h-[470px]">
            {floatingBadges.map((badge) => (
              <div
                key={badge.label}
                className={`hero-badge relative hidden rounded-full px-5 py-2 text-[1.02rem] leading-none shadow-[0_16px_34px_rgba(17,17,17,0.08)] md:block ${badge.className}`}
                style={{ animationDelay: badge.delay }}
              >
                {badge.label}
                <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 rounded-[2px] bg-inherit" />
              </div>
            ))}

            <div className="absolute inset-x-0 bottom-0 h-[220px] overflow-hidden sm:h-[352px] lg:h-[384px]">
              <div className="hero-carousel hero-carousel-mask absolute inset-x-0 bottom-0 hidden overflow-hidden sm:block">
                <div className="hero-carousel-track flex w-max items-end gap-5 pb-5 pt-5">
                  {carouselCards.map((card, index) => (
                    <div
                      key={`${card.src}-${index}`}
                      className="hero-carousel-item relative shrink-0 cursor-pointer"
                      style={{
                        height: `${desktopCardHeight}px`,
                        width: `${card.width}px`,
                      }}
                    >
                      <div
                        className="hero-stack-card h-full w-full rounded-[30px] bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${card.src})`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-gradient-to-r from-white via-white/45 to-transparent sm:block lg:w-20" />
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-l from-white via-white/45 to-transparent sm:block lg:w-20" />

              <div className="hero-carousel hero-carousel-mask absolute inset-x-0 bottom-0 overflow-hidden sm:hidden">
                <div className="hero-carousel-track flex w-max items-end gap-3 pb-3 pt-4">
                  {carouselCards.map((card, index) => (
                    <div
                      key={`${card.src}-mobile-${index}`}
                      className="hero-carousel-item relative w-[168px] shrink-0 cursor-pointer"
                      style={{ height: `${mobileCardHeight}px` }}
                    >
                      <div
                        className="hero-stack-card h-full w-full rounded-[22px] bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${card.src})`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white/35 to-transparent sm:hidden" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/35 to-transparent sm:hidden" />
            </div>
          </div>

          <p className="hero-copy mx-auto mt-5 max-w-[44rem] text-[1.03rem] leading-8 text-[#5f6773] sm:mt-7 sm:text-[1.1rem]">
            Creators can showcase prompt masterpieces, and builders can discover image, code, and
            content ideas ready for their next launch.
          </p>

          <div className="hero-copy mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/membership"
              className="rounded-full bg-[#111111] px-7 py-3 text-[1rem] text-white transition-transform duration-300 ease-out hover:-translate-y-0.5"
            >
              Join for $9.99/m
            </Link>
            <Link
              href="/latest"
              className="px-4 py-3 text-[1rem] text-[#1b1b1b] transition-colors duration-300 ease-out hover:text-[#5f6773]"
            >
              Read more
            </Link>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="section-heading-medium text-[1.65rem] leading-[1.06] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]"
            >
              Top trending topics
            </h2>
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/category"
                className="rounded-full border border-[#d8dce2] bg-white px-5 py-2.5 text-[0.96rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white"
              >
                Explore all categories
              </Link>
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scrollCategories('prev')}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b] transition-colors duration-300 hover:border-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                  <path
                    d="M15 5.5 8.5 12 15 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 12h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scrollCategories('next')}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b] transition-colors duration-300 hover:border-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                  <path
                    d="M9 5.5 15.5 12 9 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.5 12h-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div
            ref={categorySliderRef}
            className="no-scrollbar category-slider mt-5 flex items-start overflow-x-auto pb-2 snap-x snap-mandatory drag-slider sm:mt-7"
            {...categoryDragHandlers}
          >
            {isHomeContentLoading ? (
              Array.from({ length: categorySkeletonCount }).map((_, index) => (
                <div
                  key={`category-skeleton-${index}`}
                  data-category-card
                  className="category-card flex shrink-0 snap-start flex-col items-center text-center"
                >
                  <Skeleton className="h-[84px] w-[84px] !rounded-full sm:h-[112px] sm:w-[112px] lg:h-[96px] lg:w-[96px]" />
                  <Skeleton className="mt-3 h-4 w-24 rounded-full sm:mt-4" />
                  <Skeleton className="mt-2 h-3.5 w-16 rounded-full" />
                </div>
              ))
            ) : homeContentLoadError ? (
              <div className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-[28px] border border-[#e2e6ee] px-6 text-center">
                <p className="text-[0.95rem] text-[#6a7280]">{homeContentLoadError}</p>
                <button
                  type="button"
                  onClick={retryLoadHomeContent}
                  className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.86rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : displayTrendingCategories.length > 0 ? (
              displayTrendingCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  data-category-card
                  className="category-card flex shrink-0 snap-start flex-col items-center text-center"
                  aria-label={`Open ${category.title} category`}
                >
                  <div
                    className="h-[84px] w-[84px] rounded-full border border-[#e3e3e3] bg-cover bg-center sm:h-[112px] sm:w-[112px] lg:h-[96px] lg:w-[96px]"
                    style={{ backgroundImage: `url(${category.image})` }}
                  />
                  <h3 className="mt-3 text-[0.95rem] font-semibold leading-[1.2] text-[#141414] sm:mt-4 sm:text-[1.05rem]">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-[0.85rem] text-[#6a7280] sm:text-[0.9rem]">
                    <span>{category.articles} articles</span>
                  </p>
                </Link>
              ))
            ) : (
              <div className="flex min-h-[180px] w-full items-center justify-center rounded-[28px] border border-dashed border-[#d8dce2] bg-[#fafbfc] px-6 text-center text-[0.95rem] text-[#6a7280]">
                No categories published yet.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 sm:hidden">
            <Link
              href="/category"
              className="rounded-full border border-[#d8dce2] bg-white px-4 py-2 text-[0.88rem] text-[#101010]"
            >
              Explore all categories
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scrollCategories('prev')}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M15 5.5 8.5 12 15 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 12h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scrollCategories('next')}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M9 5.5 15.5 12 9 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.5 12h-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <h2 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]">
              Trending prompts
            </h2>
            <Link
              href="/prompt"
              className="whitespace-nowrap rounded-full border border-[#d8dce2] bg-white px-4 py-2 text-[0.92rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white sm:px-6 sm:py-3 sm:text-[1rem]"
            >
              Explore all prompts
            </Link>
          </div>

          <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:gap-8 lg:grid-cols-4">
            {isHomeContentLoading ? (
              Array.from({ length: trendingPromptSkeletonCount }).map((_, index) => (
                <article
                  key={`trending-prompt-skeleton-${index}`}
                  className="flex flex-col rounded-[24px] bg-transparent"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[24px]">
                    <Skeleton className="h-full w-full rounded-[24px]" />
                    <Skeleton className="absolute left-4 top-4 h-9 w-24 rounded-full bg-white/90" />
                  </div>

                  <div className="flex flex-1 flex-col px-1 pb-1 pt-4 sm:px-2">
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-full rounded-full" />
                      <Skeleton className="h-5 w-[80%] rounded-full" />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-10 rounded-full bg-[#f3f4f6]" />
                            <Skeleton className="h-4 w-5 rounded-full" />
                          </div>

                          <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-10 rounded-full bg-[#f3f4f6]" />
                            <Skeleton className="h-4 w-5 rounded-full" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-16 rounded-full" />
                          <Skeleton className="h-10 w-10 rounded-full bg-[#f3f4f6]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : homeContentLoadError ? (
              <div className="sm:col-span-2 lg:col-span-4 rounded-[22px] border border-[#e2e6ee] px-6 py-7 text-center">
                <p className="text-[0.96rem] text-[#5f6978]">{homeContentLoadError}</p>
                <button
                  type="button"
                  onClick={retryLoadHomeContent}
                  className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.86rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : displayTrendingPrompts.length > 0 ? (
              displayTrendingPrompts.map((prompt) => (
                <PromptCardUI key={prompt.id} prompt={prompt} />
              ))
            ) : (
              <div className="sm:col-span-2 lg:col-span-4 rounded-[22px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
                No prompts available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {shouldShowFollowedAuthorsSection ? (
        <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <div className="page-container-wide">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="section-heading-medium text-[1.8rem] leading-[1.05] tracking-[-0.05em] text-[#101010] sm:text-[2rem]">
                From Authors You Follow
              </h2>
              {selectedFollowedAuthorOrder.length > 0 ? (
                <p className="text-[0.9rem] text-[#5f6978]">
                  {selectedFollowedAuthorOrder.length} author
                  {selectedFollowedAuthorOrder.length === 1 ? '' : 's'} selected
                </p>
              ) : null}
            </div>

            {isFollowedAuthorsLoading ? (
              <div className="mt-6">
                <div className="flex gap-6 overflow-x-auto px-2 pt-2 pb-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`followed-author-skeleton-${index}`}
                      className="flex shrink-0 flex-col items-center gap-2"
                    >
                      <Skeleton className="h-[82px] w-[82px] rounded-full" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-3 w-16 rounded-full" />
                    </div>
                  ))}
                </div>

                <div className="mt-7 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: followedPromptSkeletonCount }).map((_, index) => (
                    <article
                      key={`followed-prompt-skeleton-${index}`}
                      className="flex flex-col rounded-[24px]"
                    >
                      <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-4 w-full rounded-full" />
                        <Skeleton className="h-4 w-[80%] rounded-full" />
                        <Skeleton className="h-4 w-[60%] rounded-full" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : followedAuthorsError ? (
              <div className="mt-6 rounded-[20px] border border-[#e2e6ee] px-5 py-5">
                <p className="text-[0.96rem] text-[#4f5b6c]">{followedAuthorsError}</p>
                <button
                  type="button"
                  onClick={retryLoadFollowedAuthors}
                  className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.9rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="no-scrollbar mt-6 flex gap-7 overflow-x-auto px-2 pt-2 pb-2">
                  {followedAuthors.map((author) => {
                    const isSelected = selectedFollowedAuthorIdSet.has(author.id);
                    const shownCount = followedPromptCountByAuthor.get(author.id) ?? 0;
                    return (
                      <button
                        key={author.id}
                        type="button"
                        onClick={() => toggleFollowedAuthorSelection(author.id)}
                        aria-pressed={isSelected}
                        className="group flex shrink-0 flex-col items-center gap-2 text-center"
                      >
                        <span
                          className={`inline-flex rounded-full transition-all ${
                            isSelected
                              ? 'ring-2 ring-[#111111] ring-offset-2'
                              : 'ring-1 ring-[#d6dde8] ring-offset-2 group-hover:ring-[#9aa6bb]'
                          }`}
                        >
                          <AuthorAvatar
                            name={author.name}
                            avatarUrl={author.avatarUrl}
                            avatarUpdatedAt={author.avatarUpdatedAt}
                            className="h-[82px] w-[82px]"
                            initialClassName="text-[1rem]"
                          />
                        </span>
                        <span
                          className={`max-w-[120px] truncate text-[0.95rem] leading-none ${
                            isSelected ? 'text-[#111111]' : 'text-[#2f3744]'
                          }`}
                        >
                          {author.name}
                        </span>
                        <span className="text-[0.84rem] leading-none text-[#6f7888]">
                          {isSelected
                            ? `${shownCount} prompt${shownCount === 1 ? '' : 's'}`
                            : 'Tap to view'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-7">
                  {isFollowedPromptsLoading ? (
                    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                      {Array.from({ length: followedPromptSkeletonCount }).map((_, index) => (
                        <article
                          key={`followed-prompts-loading-${index}`}
                          className="flex flex-col rounded-[24px]"
                        >
                          <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                          <div className="mt-4 space-y-2">
                            <Skeleton className="h-4 w-full rounded-full" />
                            <Skeleton className="h-4 w-[80%] rounded-full" />
                            <Skeleton className="h-4 w-[60%] rounded-full" />
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : followedPromptsError ? (
                    <div className="rounded-[20px] border border-[#e2e6ee] px-5 py-5">
                      <p className="text-[0.96rem] text-[#4f5b6c]">{followedPromptsError}</p>
                      <button
                        type="button"
                        onClick={retryLoadFollowedPrompts}
                        className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.9rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                      >
                        Retry
                      </button>
                    </div>
                  ) : groupedFollowedPrompts.length > 0 ? (
                    <div className="space-y-8">
                      {groupedFollowedPrompts.map((group) => {
                        if (!group.author) return null;
                        return (
                          <div key={group.author.id}>
                            <div className="mb-4">
                              <Link
                                href={`/author/${group.author.slug}`}
                                className="text-[1rem] font-medium text-[#0f1116] transition-colors duration-300 hover:text-[#313a4a]"
                              >
                                {group.author.name}
                              </Link>
                            </div>
                            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
                              {group.prompts.map((prompt) => (
                                <PromptCardUI key={prompt.id} prompt={prompt} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-[#d8dee8] px-5 py-6 text-[0.96rem] text-[#677386]">
                      No published prompts available for the selected authors yet.
                    </div>
                  )}
                </div>

                {!isFollowedPromptsLoading &&
                !followedPromptsError &&
                groupedFollowedPrompts.length > 0 ? (
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    {canLoadMoreFollowedPrompts ? (
                      <button
                        type="button"
                        onClick={loadMoreFollowedPrompts}
                        disabled={isFollowedPromptsLoadingMore}
                        className="rounded-full border border-[#d3d8df] bg-white px-7 py-3 text-[1rem] text-[#13161d] transition-colors duration-300 hover:border-[#13161d] hover:bg-[#13161d] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isFollowedPromptsLoadingMore ? 'Loading...' : 'Load more'}
                      </button>
                    ) : (
                      <p className="text-[0.9rem] text-[#667284]">You have reached the latest prompts.</p>
                    )}

                    {followedPromptsLoadMoreError ? (
                      <button
                        type="button"
                        onClick={loadMoreFollowedPrompts}
                        className="rounded-full border border-[#111111] px-5 py-2 text-[0.86rem] text-[#111111] transition-colors duration-300 hover:bg-[#111111] hover:text-white"
                      >
                        Retry load more
                      </button>
                    ) : null}

                    {followedPromptsLoadMoreError ? (
                      <p className="w-full text-center text-[0.88rem] text-[#c34a4a]">
                        {followedPromptsLoadMoreError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
            <div
              className="min-h-[280px] overflow-hidden rounded-[28px] bg-cover bg-center sm:min-h-[420px] sm:rounded-[32px] lg:min-h-[560px] lg:rounded-[34px]"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400)',
              }}
            />

            <div className="rounded-[28px] bg-[#f4f3ef] p-5 sm:rounded-[32px] sm:p-8 lg:rounded-[34px] lg:p-10">
              <h2
                className="section-heading-medium text-[2rem] leading-[0.96] tracking-[-0.07em] text-[#080808] sm:text-[2.25rem] lg:text-[2.5rem]"
              >
                Why Choose Us
              </h2>
              <p className="mt-4 max-w-[36rem] text-[0.98rem] leading-7 text-[#5d636c] sm:mt-5 sm:text-[1.08rem] sm:leading-8">
                We pride ourselves on offering products that meet the highest standards
                of quality. Each item is carefully selected, tested, and crafted to ensure
                durability and customer satisfaction.
              </p>

              <div className="mt-7 divide-y divide-[#d8d4ca] sm:mt-8">
                {whyChooseItems.map((item, index) => {
                  const isOpen = openWhyChoose === item.title;
                  const buttonId = `why-choose-trigger-${index}`;
                  const panelId = `why-choose-panel-${index}`;

                  return (
                    <div key={item.title}>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenWhyChoose(item.title)}
                        className="flex w-full items-center justify-between gap-4 py-7 text-left sm:py-8"
                      >
                        <span className="pr-4 text-[1.3rem] leading-[1.05] tracking-[-0.04em] text-[#111111] sm:text-[1.55rem]">
                          {item.title}
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-[2.4rem] font-[300] leading-none text-[#111111] sm:text-[2.8rem]"
                        >
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                      {isOpen ? (
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          className="pb-7 pr-12 sm:pb-8"
                        >
                          <p className="max-w-[36rem] text-[1rem] leading-8 text-[#5d636c] sm:text-[1.02rem]">
                            {item.description}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:mt-6 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.45fr] xl:gap-6">
            {benefitCards.map((card) => (
              <article
                key={card.title}
                className={`${card.tone} flex min-h-[280px] flex-col rounded-[24px] p-5 sm:min-h-[320px] sm:rounded-[28px] sm:p-8`}
              >
                <h3 className="max-w-[12rem] text-[1.75rem] leading-[1.05] tracking-[-0.05em] text-[#090909] sm:text-[2rem]">
                  {card.title}
                </h3>
                <p className="mt-6 max-w-[16rem] text-[0.98rem] leading-7 text-[#5f6773] sm:mt-8 sm:text-[1rem] sm:leading-8">
                  {card.description}
                </p>
                <div className="mt-auto pt-6 sm:pt-8">
                  <button
                    type="button"
                    className="rounded-full border border-[#121212] px-6 py-2.5 text-[0.98rem] text-[#111111] transition-colors duration-300 hover:bg-[#111111] hover:text-white sm:px-7 sm:py-3 sm:text-[1rem]"
                  >
                    See More
                  </button>
                </div>
              </article>
            ))}

            <article
              className="relative min-h-[280px] overflow-hidden rounded-[24px] bg-cover bg-center p-5 sm:min-h-[320px] sm:rounded-[30px] sm:p-8"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172acc] via-[#0f172a26] to-transparent" />
              <div className="relative z-10 flex h-full min-h-[256px] flex-col justify-end">
                <h3 className="max-w-[10rem] text-[2.5rem] leading-[0.95] tracking-[-0.06em] text-white sm:text-[3.6rem]">
                  Summer Cloth
                </h3>
              </div>
              <div className="absolute bottom-4 right-4 z-10 flex h-[92px] w-[92px] items-center justify-center bg-[#ff6631] text-center text-[0.88rem] font-medium uppercase leading-tight text-white [clip-path:polygon(50%_0%,61%_24%,86%_7%,74%_32%,100%_34%,77%_50%,100%_66%,74%_68%,86%_93%,61%_76%,50%_100%,39%_76%,14%_93%,26%_68%,0%_66%,23%_50%,0%_34%,26%_32%,14%_7%,39%_24%)] sm:bottom-5 sm:right-5 sm:h-[118px] sm:w-[118px] sm:text-[1rem]">
                30%
                <br />
                OFF
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="section-heading-medium text-[1.65rem] leading-[1.06] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]"
            >
              Top trending authors
            </h2>
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/author"
                className="rounded-full border border-[#d8dce2] bg-white px-5 py-2.5 text-[0.96rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white"
              >
                Explore all authors
              </Link>
              <button
                type="button"
                aria-label="Scroll authors left"
                onClick={() => scrollTrendingAuthors('prev')}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b] transition-colors duration-300 hover:border-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                  <path
                    d="M15 5.5 8.5 12 15 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 12h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Scroll authors right"
                onClick={() => scrollTrendingAuthors('next')}
                className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b] transition-colors duration-300 hover:border-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                  <path
                    d="M9 5.5 15.5 12 9 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.5 12h-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div
            ref={trendingAuthorsSliderRef}
            className="no-scrollbar category-slider mt-5 flex items-start overflow-x-auto pb-2 snap-x snap-mandatory drag-slider sm:mt-7"
            {...trendingAuthorsDragHandlers}
          >
            {isTrendingAuthorsLoading ? (
              Array.from({ length: authorSkeletonCount }).map((_, index) => (
                <div
                  key={`author-skeleton-${index}`}
                  data-author-card
                  className="category-card flex shrink-0 snap-start flex-col items-center text-center"
                >
                  <Skeleton className="h-[84px] w-[84px] !rounded-full sm:h-[112px] sm:w-[112px] lg:h-[96px] lg:w-[96px]" />
                  <Skeleton className="mt-3 h-4 w-24 rounded-full sm:mt-4" />
                  <Skeleton className="mt-2 h-3.5 w-16 rounded-full" />
                </div>
              ))
            ) : trendingAuthorsLoadError ? (
              <div className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-[28px] border border-[#e2e6ee] px-6 text-center">
                <p className="text-[0.95rem] text-[#6a7280]">{trendingAuthorsLoadError}</p>
                <button
                  type="button"
                  onClick={retryLoadTrendingAuthors}
                  className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.86rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : displayTrendingAuthors.length > 0 ? (
              displayTrendingAuthors.map((author) => (
                <Link
                  key={author.id}
                  href={`/author/${author.slug}`}
                  data-author-card
                  className="category-card flex shrink-0 snap-start flex-col items-center text-center"
                  aria-label={`Open ${author.title} author profile`}
                >
                  <AuthorAvatar
                    name={author.title}
                    avatarUrl={author.avatarUrl}
                    avatarUpdatedAt={author.avatarUpdatedAt}
                    className="h-[84px] w-[84px] border border-[#e3e3e3] sm:h-[112px] sm:w-[112px] lg:h-[96px] lg:w-[96px]"
                    initialClassName="text-[0.95rem]"
                  />
                  <h3 className="mt-3 text-[0.95rem] font-semibold leading-[1.2] text-[#141414] sm:mt-4 sm:text-[1.05rem]">
                    {author.title}
                  </h3>
                  <p className="mt-1 text-[0.85rem] text-[#6a7280] sm:text-[0.9rem]">
                    <span>{author.articles} articles</span>
                  </p>
                </Link>
              ))
            ) : (
              <div className="flex min-h-[180px] w-full items-center justify-center rounded-[28px] border border-dashed border-[#d8dce2] bg-[#fafbfc] px-6 text-center text-[0.95rem] text-[#6a7280]">
                No authors published yet.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 sm:hidden">
            <Link
              href="/author"
              className="rounded-full border border-[#d8dce2] bg-white px-4 py-2 text-[0.88rem] text-[#101010]"
            >
              Explore all authors
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll authors left"
                onClick={() => scrollTrendingAuthors('prev')}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M15 5.5 8.5 12 15 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 12h9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Scroll authors right"
                onClick={() => scrollTrendingAuthors('next')}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#d9d9d4] text-[#1b1b1b]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M9 5.5 15.5 12 9 18.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.5 12h-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide overflow-hidden rounded-[30px] bg-[#d5ea52] px-6 py-8 sm:px-10 sm:py-10 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-12 lg:py-12">
          <div className="relative z-10 max-w-[34rem]">
            <h2
              className="section-heading-medium max-w-[11ch] text-[2.25rem] leading-[0.96] tracking-[-0.07em] text-[#0f0f0f] sm:text-[2.6rem] lg:text-[4rem]"
            >
              Best Prompt Packs Curated For You
            </h2>
            <p className="mt-6 max-w-[26rem] text-[1rem] leading-8 text-[#2a3010] sm:text-[1.08rem]">
              For creators who want faster ideation, stronger outputs, and a polished starting
              point for every launch.
            </p>
            <Link
              href="/latest"
              className="mt-8 inline-flex rounded-full border border-black/20 bg-[#0f1116] px-6 py-3 text-[1rem] font-[500] text-white transition-colors duration-300 hover:bg-black"
            >
              Explore Now
            </Link>
          </div>

          <div className="relative mt-10 min-h-[260px] sm:min-h-[320px] lg:mt-0 lg:min-h-[420px]">
            <div className="absolute left-[12%] top-1/2 h-[220px] w-[220px] -translate-y-1/2 rounded-full bg-[#bdd63e]/50 sm:h-[280px] sm:w-[280px] lg:h-[360px] lg:w-[360px]" />
            <div className="absolute bottom-[6%] right-[6%] h-[140px] w-[140px] rounded-full bg-[#fff]/40 sm:h-[180px] sm:w-[180px] lg:h-[240px] lg:w-[240px]" />
            <div
              className="absolute inset-x-[10%] bottom-0 top-[2%] z-10 rounded-[28px] bg-contain bg-center bg-no-repeat sm:inset-x-[12%] lg:inset-x-[16%]"
              style={{
                backgroundImage: `url(${ctaRobo.src})`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="section-heading-medium text-[1.65rem] leading-[1.18] tracking-[-0.04em] text-[#111111] sm:text-[2.25rem] lg:text-[2.5rem]">
              <span className="text-[#111111]">More posts.</span>{' '}
              <span className="text-[#687082]">You may also be interested in.</span>
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href="/blog"
                className="rounded-full border border-[#d5d8de] bg-white px-4 py-2 text-[0.9rem] text-[#111111] transition-colors duration-300 hover:border-[#111111] hover:bg-[#111111] hover:text-white sm:px-5 sm:py-2.5 sm:text-[0.96rem]"
              >
                Explore more
              </Link>
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  aria-label="Previous recently uploaded post"
                  onClick={() => scrollRecentlyUploaded('prev')}
                  className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#d5d8de] text-[#111111] transition-colors duration-300 hover:border-[#111111]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                    <path
                      d="M15 5.5 8.5 12 15 18.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next recently uploaded post"
                  onClick={() => scrollRecentlyUploaded('next')}
                  className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#d5d8de] text-[#111111] transition-colors duration-300 hover:border-[#111111]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                    <path
                      d="M9 5.5 15.5 12 9 18.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div
            ref={recentlyUploadedSliderRef}
            className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:mt-7 sm:gap-5 drag-slider"
            {...recentlyUploadedDragHandlers}
          >
            {isHomeContentLoading ? (
              Array.from({ length: recentPostsSkeletonCount }).map((_, index) => (
                <article
                  key={`recent-post-skeleton-${index}`}
                  data-recent-card
                  className="w-[260px] shrink-0 snap-start sm:w-[320px] lg:w-[calc((100%-2.5rem)/3)]"
                >
                  <div className="rounded-[20px] bg-white p-2.5">
                    <Skeleton className="aspect-[16/9] w-full rounded-[20px] bg-[#e5ebf2]" />
                    <div className="mt-4 space-y-2.5">
                      <Skeleton className="h-6 w-full rounded-full" />
                      <Skeleton className="h-6 w-[82%] rounded-full" />
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <Skeleton className="h-9 w-24 rounded-[10px]" />
                      <Skeleton className="h-9 w-24 rounded-full" />
                    </div>
                  </div>
                </article>
              ))
            ) : homeContentLoadError ? (
              <div className="w-full rounded-[24px] border border-[#e2e6ee] bg-white px-6 py-7 text-center">
                <p className="text-[0.96rem] text-[#5f6978]">{homeContentLoadError}</p>
                <button
                  type="button"
                  onClick={retryLoadHomeContent}
                  className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.86rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : displayRecentPosts.length > 0 ? (
              displayRecentPosts.map((post) => (
                <PostCardUI
                  key={post.title}
                  className="w-[260px] shrink-0 snap-start sm:w-[320px] lg:w-[calc((100%-2.5rem)/3)]"
                  href={`/blog/${post.slug}`}
                  imageUrl={post.image}
                  readTime={post.readTime}
                  title={post.title}
                />
              ))
            ) : (
              <div className="w-full rounded-[24px] border border-dashed border-[#d8dee8] bg-[#fafbfc] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
                No posts available yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide overflow-hidden rounded-[20px] border border-[#e1e4ea] bg-white">
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[1rem] font-medium text-[#11141a]">Tags</p>
              <Link
                href="/tag"
                className="rounded-full border border-[#d8dce2] bg-white px-4 py-2 text-[0.9rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white"
              >
                Explore more tags
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {isHomeContentLoading ? (
                Array.from({ length: 14 }).map((_, index) => (
                  <Skeleton
                    key={`tag-skeleton-${index}`}
                    className="h-[42px] w-[120px] rounded-full bg-[#f0f2f4]"
                  />
                ))
              ) : homeContentLoadError ? (
                <div className="rounded-[16px] border border-[#e2e6ee] px-4 py-3">
                  <p className="text-[0.95rem] text-[#5f6978]">{homeContentLoadError}</p>
                  <button
                    type="button"
                    onClick={retryLoadHomeContent}
                    className="mt-3 rounded-full border border-[#13161d] px-4 py-1.5 text-[0.82rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : displayPopularTags.length > 0 ? (
                displayPopularTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug || toSlug(tag.name)}`}
                    className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-[#f0f2f4] px-4 py-2 text-[0.92rem] leading-none text-[#3d4654] sm:px-5 sm:text-[0.95rem]"
                  >
                    <span>{tag.name}</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[0.78rem] text-[#3d4654]">
                      {tag.usage}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-[16px] bg-[#f8fafc] px-4 py-3 text-[0.95rem] text-[#6f7786]">
                  No tags available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide rounded-[34px] bg-white px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="max-w-[28rem]">
              <h2 className="text-[2rem] font-medium leading-[0.96] tracking-[-0.07em] text-[#090909] sm:text-[2.25rem] lg:text-[4rem]">
                <span className="block">From our</span>
                <span className="block">community.</span>
              </h2>

              <p className="mt-6 max-w-[22rem] text-[1.05rem] leading-[1.7] text-[#1c1c1c] sm:text-[1.18rem] lg:mt-8 lg:text-[1.28rem]">
                Here’s what other subscribers had to say about Gemini Prompts.
              </p>

              <div className="mt-8 flex items-center gap-3 lg:mt-12">
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  onClick={goToPreviousTestimonial}
                  className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#dedede] text-[#111111] transition-colors duration-300 hover:border-[#111111]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                    <path
                      d="M15 5.5 8.5 12 15 18.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 12h9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next testimonial"
                  onClick={goToNextTestimonial}
                  className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-[#dedede] text-[#111111] transition-colors duration-300 hover:border-[#111111]"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                    <path
                      d="M9 5.5 15.5 12 9 18.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.5 12h-9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <p className="ml-1 text-[0.95rem] leading-none text-[#5f6773]">
                  {activeTestimonial + 1} / {totalTestimonials}
                </p>
              </div>
            </div>

            <div className="max-w-[46rem] lg:pt-2">
              <div className="text-[4rem] leading-none text-[#2233a4] sm:text-[4.8rem]">“</div>
              <blockquote className="-mt-2 text-[1.55rem] leading-[1.2] tracking-[-0.03em] text-[#090909] sm:text-[1.95rem] lg:text-[2.55rem]">
                {currentTestimonial.quote}
              </blockquote>

              <div className="mt-7 flex items-center gap-4 lg:mt-8">
                <div
                  className="h-[64px] w-[64px] shrink-0 rounded-full bg-cover bg-center sm:h-[68px] sm:w-[68px]"
                  style={{
                    backgroundImage: currentTestimonial.avatar,
                  }}
                />
                <div>
                  <p className="text-[1.45rem] leading-none font-medium tracking-[-0.03em] text-[#090909] sm:text-[1.55rem]">
                    {currentTestimonial.name}
                  </p>
                  <p className="mt-1.5 text-[0.98rem] leading-7 text-[#222222] sm:text-[1.02rem]">
                    {currentTestimonial.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide overflow-hidden rounded-[34px] bg-[#f2f3f5] py-10 sm:py-12 lg:py-14">
          <div className="community-strip">
            <div className="community-track" style={{ animationDuration: '40s' }}>
              {[0, 1].map((groupIndex) => (
                <div key={`community-top-${groupIndex}`} className="community-row">
                  {communityTopCards.map((card, index) => (
                    <div
                      key={`top-${groupIndex}-${card.src}-${index}`}
                      role="img"
                      aria-label={card.alt}
                      className={`${communityCardSize} shrink-0 rounded-[22px] bg-cover bg-center`}
                      style={{ backgroundImage: `url(${card.src})` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[42rem] px-6 text-center sm:mt-12">
            <h2
              className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.06em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]"
            >
              You will find yourself among us
            </h2>
            <p className="mx-auto mt-5 max-w-[29rem] text-[1.03rem] leading-8 text-[#5f6773] sm:text-[1.12rem]">
              Dive into a dynamic community where creators and buyers seamlessly merge through
              bold ideas, visual inspiration, and trusted prompt craft.
            </p>
            <Link
              href="/membership"
              className="mt-7 inline-flex rounded-full bg-[#101010] px-7 py-3 text-[1rem] font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              Join community
            </Link>
          </div>

          <div className="community-strip mt-10 sm:mt-12">
            <div className="community-track community-track-reverse" style={{ animationDuration: '44s' }}>
              {[0, 1].map((groupIndex) => (
                <div
                  key={`community-bottom-${groupIndex}`}
                  className="community-row"
                >
                  {communityBottomCards.map((card, index) => (
                    <div
                      key={`bottom-${groupIndex}-${card.src}-${index}`}
                      role="img"
                      aria-label={card.alt}
                      className={`${communityCardSize} shrink-0 rounded-[22px] bg-cover bg-center`}
                      style={{ backgroundImage: `url(${card.src})` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <h2 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]">
            Watch, Read, Listen
          </h2>

          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {isWatchReadListenLoadingInitial && watchReadListenPrompts.length === 0
              ? Array.from({ length: watchReadListenSkeletonCount }).map((_, index) => (
                  <article
                    key={`watch-read-listen-skeleton-${index}`}
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
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-4 w-6 rounded-full" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-4 w-6 rounded-full" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-4 w-16 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                          </div>
                        </div>
                      </div>
                      <Skeleton className="min-h-[170px] rounded-[20px]" />
                    </div>
                  </article>
                ))
              : watchReadListenPrompts.map((prompt) => (
                  <WatchReadListenPromptCard key={prompt.id} prompt={prompt} />
                ))}
          </div>

          {!isWatchReadListenLoadingInitial &&
          watchReadListenPrompts.length === 0 &&
          watchReadListenLoadError ? (
            <div className="mt-7">
              <div className="grid gap-5 lg:grid-cols-2">
                {Array.from({ length: watchReadListenSkeletonCount }).map((_, index) => (
                  <article
                    key={`watch-read-listen-retry-skeleton-${index}`}
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
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-[20px] border border-[#e2e6ee] px-5 py-5">
                <p className="text-[0.96rem] text-[#4f5b6c]">{watchReadListenLoadError}</p>
              </div>

              <button
                type="button"
                onClick={retryLoadWatchReadListenInitial}
                className="mt-4 rounded-full border border-[#13161d] px-5 py-2 text-[0.9rem] text-[#13161d] transition-colors duration-300 hover:bg-[#13161d] hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isWatchReadListenLoadingInitial &&
          watchReadListenPrompts.length === 0 &&
          !watchReadListenLoadError ? (
            <div className="mt-7 rounded-[20px] border border-dashed border-[#d8dee8] px-5 py-6 text-[0.96rem] text-[#677386]">
              No prompts available yet.
            </div>
          ) : null}

          {watchReadListenPrompts.length > 0 && watchReadListenHasMore ? (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={loadMoreWatchReadListen}
                disabled={isWatchReadListenLoadingMore}
                className="rounded-full border border-[#d3d8df] bg-white px-7 py-3 text-[1rem] text-[#13161d] transition-colors duration-300 hover:border-[#13161d] hover:bg-[#13161d] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isWatchReadListenLoadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          ) : null}

          {watchReadListenLoadMoreError ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-center">
              <p className="text-[0.9rem] text-[#c34a4a]">{watchReadListenLoadMoreError}</p>
              <button
                type="button"
                onClick={retryLoadWatchReadListenMore}
                className="rounded-full border border-[#111111] px-5 py-2 text-[0.86rem] text-[#111111] transition-colors duration-300 hover:bg-[#111111] hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide rounded-[30px] border border-[#e6e9ef] bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="text-center">
            <h2 className="section-heading-medium text-[2rem] leading-[1.08] tracking-[-0.05em] text-[#111827] sm:text-[2.25rem] lg:text-[2.5rem]">
              Questions? Look here.
            </h2>
            <p className="mx-auto mt-4 max-w-[46rem] text-[0.98rem] leading-7 text-[#7a8191] sm:text-[1.05rem]">
              Can&apos;t find an answer? Call us at (855) 692-5326 or email contact@geminiprompts.com.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr] lg:gap-10">
            <aside className="rounded-[18px] border border-[#eceff4] bg-[#fafbfd] p-4 sm:p-5">
              <p className="text-[1.1rem] leading-none text-[#161b24] sm:text-[1.18rem]">Table of Contents</p>
              <div className="mt-4 flex flex-col gap-2">
                {homeFaqCategories.map((category: string) => {
                  const isActive = activeFaqCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setFaqCategory(category)}
                      className={`w-full rounded-[10px] px-3 py-2 text-left text-[0.96rem] transition-colors sm:text-[1rem] ${isActive ? 'bg-[#eef4ff] text-[#2d57da]' : 'text-[#394150] hover:bg-[#f2f4f8]'}`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="rounded-[18px] border border-[#eceff4] bg-white px-4 sm:px-6">
              {visibleFaqItems.map((item, index) => {
                const isOpen = openFaqId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`py-5 ${index !== visibleFaqItems.length - 1 ? 'border-b border-[#eceff4]' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(item.id)}
                      className="flex w-full items-start gap-4 text-left"
                    >
                      <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef4ff] text-[1.15rem] leading-none text-[#2d57da]">
                        {isOpen ? '−' : '+'}
                      </span>
                      <span className="text-[1.2rem] leading-[1.35] tracking-[-0.01em] text-[#141922] sm:text-[1.45rem]">
                        {item.question}
                      </span>
                    </button>
                    {isOpen ? (
                      <p className="ml-11 mt-3 max-w-[52rem] text-[0.98rem] leading-8 text-[#5f6778] sm:text-[1.04rem]">
                        {item.answer}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
