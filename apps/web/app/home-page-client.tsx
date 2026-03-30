'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AuthorAvatar } from './components/author-avatar';
import { HeroSearchDropdown } from './components/hero-search-dropdown';
import { PostCardUI } from './components/post-card';
import { PromptCardUI } from './components/prompt-listing';
import { usePromptInteractions } from './components/prompt-interactions/use-prompt-interactions';
import { Skeleton } from './components/ui/skeleton';
import { AnimatedCounter } from './components/animated-counter';
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
import {
  resolveCategoryImage,
  resolvePostImage,
  resolvePromptImage,
} from '../lib/content-image-fallbacks';
import { COMMUNITY_IMAGE_URLS, CTA_ROBO_URL } from '../lib/site-assets';
import { refreshSession } from '../lib/utils/session';

const SESSION_FALLBACK = {
  data: null,
  status: 'unauthenticated' as const,
  update: (async () => null) as ReturnType<typeof useSession>['update'],
};

function useSafeSession() {
  try {
    return useSession();
  } catch {
    return SESSION_FALLBACK;
  }
}

const heroCards = [
  {
    src: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/642a12b6bee2014946b05c6f05d3c9e6.avif',
    alt: 'Gemini Prompts hero slider image 1',
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
    src: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/defe2d7e19db3aea6c6c5ad368c91376.webp',
    alt: 'Gemini Prompts hero slider image 2',
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
    src: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/d31a683406c15454afd78f1e2fb4decc.webp',
    alt: 'Gemini Prompts hero slider image 3',
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
    src: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/8e3a7a03f5a3d4f21c8e88f2c81ac254.webp',
    alt: 'Gemini Prompts hero slider image 4',
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
    src: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/d5c02129175eddda92eff79b9036632d.webp',
    alt: 'Gemini Prompts hero slider image 5',
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
    src: 'https://media.geminiprompts.io/gemini_prompts/media/2026/03/25378b7205f765b8bb69b5107f096246.webp',
    alt: 'Gemini Prompts hero slider image 6',
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

function formatCompactCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const whyChooseItems = [
  {
    title: 'Gemini Prompt Clarity',
    description:
      'Every featured gemini prompt is reviewed for usefulness, originality, and creator-ready output structure so you get practical results faster.',
  },
  {
    title: 'Fast Creator Workflow',
    description:
      'Discover prompt packs, save references, and move from idea to publish without losing momentum using prompt-for-gemini templates.',
  },
  {
    title: 'High-Intent Prompt Variety',
    description:
      'From gemini ai photo prompt formats to niche creative sets like rare animals, one library supports multiple creator use cases.',
  },
  {
    title: 'Trend + Timeless Balance',
    description:
      'We blend trending prompt seen formats with evergreen templates so your output stays fresh without losing quality fundamentals.',
  },
];

const benefitCards = [
  {
    title: 'High-Signal Gemini Prompt Quality',
    description:
      'Every prompt is reviewed for clarity, structure, and output consistency so you can generate stronger results with less trial and error.',
    tone: 'bg-[#fff0e6]',
  },
  {
    title: 'Weekly Trending Prompt Drops',
    description:
      'Stay current with fresh prompt seen styles, festival themes, and viral content formats published every week.',
    tone: 'bg-[#f3f3f1]',
  },
  {
    title: 'Creator-Ready Prompt Formats',
    description:
      'Use copy-paste prompt formats for Gemini AI, ChatGPT, and visual workflows without rewriting from scratch.',
    tone: 'bg-[#f3f3f1]',
  },
];

const testimonials = [
  {
    quote:
      'I used to test 20+ prompts to get one usable image. Now I get strong portrait options in a few tries, especially for lighting and mood.',
    name: 'Kyle Weznick',
    role: 'Wedding Photographer, Austin',
    avatar: `url(${COMMUNITY_IMAGE_URLS[2]})`,
  },
  {
    quote:
      'The prompts are easy to copy and tweak. I get better skin tones, cleaner outfits, and backgrounds that actually match my concept.',
    name: 'Nina Alvarez',
    role: 'Reels Creator, Mumbai',
    avatar: `url(${COMMUNITY_IMAGE_URLS[5]})`,
  },
  {
    quote:
      'We use these prompts for product mockups and social posts. The image quality stays consistent, so our review cycle is much faster.',
    name: 'Rohan Mehta',
    role: 'Product Designer, Pixel Forge',
    avatar: `url(${COMMUNITY_IMAGE_URLS[8]})`,
  },
  {
    quote:
      'I am not a technical person, but this made AI image creation simple. I can turn rough ideas into polished visuals in minutes.',
    name: 'Elena Brooks',
    role: 'Content Manager, Buildlane',
    avatar: `url(${COMMUNITY_IMAGE_URLS[11]})`,
  },
  {
    quote:
      'For ads and thumbnails, these prompt packs save a lot of time. We test more visual angles without rewriting everything from scratch.',
    name: 'Marcus Lee',
    role: 'Growth Marketer, Brightbit',
    avatar: `url(${COMMUNITY_IMAGE_URLS[14]})`,
  },
  {
    quote:
      'What I like most is the friendly style. The prompts feel practical, and my feed now looks more cohesive across different themes.',
    name: 'Priya Nair',
    role: 'Lifestyle Creator, Orbit Atelier',
    avatar: `url(${COMMUNITY_IMAGE_URLS[17]})`,
  },
];

const communityCardSize = 'h-[80px] w-[80px] sm:h-[96px] sm:w-[96px]';

const communityTopCards = [
  {
    src: COMMUNITY_IMAGE_URLS[0],
    alt: 'Community member portrait 1',
  },
  {
    src: COMMUNITY_IMAGE_URLS[1],
    alt: 'Community member portrait 2',
  },
  {
    src: COMMUNITY_IMAGE_URLS[2],
    alt: 'Community member portrait 3',
  },
  {
    src: COMMUNITY_IMAGE_URLS[3],
    alt: 'Community member portrait 4',
  },
  {
    src: COMMUNITY_IMAGE_URLS[4],
    alt: 'Community member portrait 5',
  },
  {
    src: COMMUNITY_IMAGE_URLS[5],
    alt: 'Community member portrait 6',
  },
  {
    src: COMMUNITY_IMAGE_URLS[6],
    alt: 'Community member portrait 7',
  },
  {
    src: COMMUNITY_IMAGE_URLS[7],
    alt: 'Community member portrait 8',
  },
  {
    src: COMMUNITY_IMAGE_URLS[8],
    alt: 'Community member portrait 9',
  },
  {
    src: COMMUNITY_IMAGE_URLS[9],
    alt: 'Community member portrait 10',
  },
];

const communityBottomCards = [
  {
    src: COMMUNITY_IMAGE_URLS[10],
    alt: 'Community member portrait 11',
  },
  {
    src: COMMUNITY_IMAGE_URLS[11],
    alt: 'Community member portrait 12',
  },
  {
    src: COMMUNITY_IMAGE_URLS[12],
    alt: 'Community member portrait 13',
  },
  {
    src: COMMUNITY_IMAGE_URLS[13],
    alt: 'Community member portrait 14',
  },
  {
    src: COMMUNITY_IMAGE_URLS[14],
    alt: 'Community member portrait 15',
  },
  {
    src: COMMUNITY_IMAGE_URLS[15],
    alt: 'Community member portrait 16',
  },
  {
    src: COMMUNITY_IMAGE_URLS[16],
    alt: 'Community member portrait 17',
  },
  {
    src: COMMUNITY_IMAGE_URLS[17],
    alt: 'Community member portrait 18',
  },
  {
    src: COMMUNITY_IMAGE_URLS[18],
    alt: 'Community member portrait 19',
  },
  {
    src: COMMUNITY_IMAGE_URLS[19],
    alt: 'Community member portrait 20',
  },
];

const useCaseCards = [
  {
    description:
      'Pick image prompts by mood, style, and goal so you spend less time testing and more time creating.',
    icon: 'spark',
    title: 'Find The Right Prompt Fast',
  },
  {
    description:
      'Start in Gemini for visuals, then use ChatGPT for captions and post copy from the same idea.',
    icon: 'stack',
    title: 'Use Across Gemini & ChatGPT',
  },
  {
    description:
      'Prepare prompt sets for upcoming posts, festive edits, and client work in one simple workflow.',
    icon: 'bars',
    title: 'Weekly Content Planning',
  },
  {
    description:
      'Get sharper portrait details, better lighting, and more consistent backgrounds with structured templates.',
    icon: 'shield',
    title: 'Cleaner Image Results',
  },
  {
    description:
      'Use pre-built packs for reels, thumbnails, and campaign visuals when you need a fast turnaround.',
    icon: 'bolt',
    title: 'Ready-Made Prompt Packs',
  },
  {
    description:
      'Save top-performing prompts, tweak them, and build your own image style library over time.',
    icon: 'refresh',
    title: 'Improve With Every Post',
  },
];

function renderUseCaseIcon(icon: string) {
  if (icon === 'spark') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
        <path
          d="M5.5 12.5c3.2 0 5.8-2.6 5.8-5.8 0 3.2 2.6 5.8 5.8 5.8-3.2 0-5.8 2.6-5.8 5.8 0-3.2-2.6-5.8-5.8-5.8Zm10.8-7.8v2m1-1h-2M5.8 18.4v1.7m.8-.8H5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === 'stack') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
        <path
          d="m12 5 7 3.8-7 3.8-7-3.8L12 5Zm7 7.2-7 3.8-7-3.8M19 16l-7 3.8L5 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === 'bars') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
        <path
          d="M6 18V8m6 10V5m6 13v-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (icon === 'shield') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
        <path
          d="m12 4 7 2.7v5.2c0 4.2-2.7 7.9-7 9.8-4.3-1.9-7-5.6-7-9.8V6.7L12 4Zm-3.1 8.2 2.3 2.2 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === 'bolt') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
        <path
          d="M13.2 3 5.4 13.1h5.5L9.8 21l8.8-10.9h-5.5L13.2 3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M20 11.6A8 8 0 1 1 17.7 6m2.3-.3v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const homeFaqCategories = [
  'Gemini Prompt Basics',
  'Photo & Visual',
  'Boys & Girls Prompts',
  'Usage & Access',
];

const faqItems = [
  {
    category: 'Gemini Prompt Basics',
    id: 'what-is-gemini-prompt',
    question: 'What is a gemini prompt and how do I use it?',
    answer:
      'A gemini prompt is a ready instruction you paste into Gemini AI to get the output style you want. Pick a prompt, customize details like mood or scene, then run it in Gemini.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'gemini-ai-prompt-vs-normal',
    question: 'Is a gemini ai prompt different from a normal prompt?',
    answer:
      'Yes. A strong gemini ai prompt is structured with intent, style, context, and constraints, so Gemini can generate cleaner and more consistent results.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'google-gemini-prompt-compatibility',
    question: 'Can I use the same google gemini prompt in ChatGPT or Midjourney?',
    answer:
      'You can reuse the base idea, but each model responds best to slight format changes. Start with a google gemini prompt, then adjust wording for ChatGPT text tasks or Midjourney visual styles.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'prompt-seen-meaning',
    question: 'What does prompt seen mean in trending reels and edits?',
    answer:
      'Prompt seen usually means the creator used a public prompt format already trending online. You can recreate the look by using a similar structure and replacing the subject details.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'prompt-for-gemini-structure',
    question: 'How should I structure a prompt for gemini for better output?',
    answer:
      'Use a simple order: subject, context, style, camera or tone details, and output goal. Structured prompts reduce random outputs and improve quality.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'gemini-prompt-length',
    question: 'Should a gemini prompt be short or detailed?',
    answer:
      'For creative visuals, detailed prompts usually perform better. Keep it clear and specific instead of adding unrelated words.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'gemini-prompt-with-examples',
    question: 'Can I include examples inside a gemini ai prompt?',
    answer:
      'Yes. Adding one compact example can help Gemini understand your expected style, tone, and output format more accurately.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'gemini-prompt-for-beginners',
    question: 'What is the easiest gemini prompt format for beginners?',
    answer:
      'Start with: "Create [subject] in [style] with [lighting/background], high detail, realistic quality." Then tweak one element at a time.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'avoid-gemini-prompt-mistakes',
    question: 'What common mistakes should I avoid in a gemini prompt?',
    answer:
      'Avoid vague terms, conflicting styles, and missing context. Clear direction and consistent style cues produce much stronger results.',
  },
  {
    category: 'Gemini Prompt Basics',
    id: 'gemini-prompt-output-consistency',
    question: 'How can I make gemini prompt output more consistent?',
    answer:
      'Reuse a stable prompt template, keep style language consistent, and only change one variable per generation cycle.',
  },
  {
    category: 'Photo & Visual',
    id: 'best-gemini-ai-photo-prompt',
    question: 'Which gemini ai photo prompt works best for realistic edits?',
    answer:
      'Use prompts that include lighting, lens style, texture detail, and background mood. This improves skin detail, depth, and realism for portrait and cinematic image results.',
  },
  {
    category: 'Photo & Visual',
    id: 'prompt-for-gemini-cinematic',
    question: 'How do I write a prompt for gemini for cinematic photos?',
    answer:
      'Start with subject, add camera angle and lighting, then define color mood and environment. A good prompt for gemini uses clear visual direction instead of broad one-line instructions.',
  },
  {
    category: 'Photo & Visual',
    id: 'rare-animals-prompts',
    question: 'Do you have rare animals prompt ideas?',
    answer:
      'Yes. We publish rare animals prompt concepts for cinematic wildlife posters, fantasy edits, and realistic nature-style visuals with rich environmental detail.',
  },
  {
    category: 'Photo & Visual',
    id: 'lighting-camera-details',
    question: 'Do lighting and camera details matter in a gemini ai photo prompt?',
    answer:
      'Yes, they matter a lot. Keywords like soft light, golden hour, 85mm lens, and shallow depth create more realistic and controllable visuals.',
  },
  {
    category: 'Photo & Visual',
    id: 'upscaling-photo-quality',
    question: 'How do I get higher-quality images from photo prompts?',
    answer:
      'Use clear composition details, realistic texture cues, and explicit quality instructions like high detail and natural skin texture.',
  },
  {
    category: 'Photo & Visual',
    id: 'background-replacement',
    question: 'Can I use prompts for clean background replacement?',
    answer:
      'Yes. Describe foreground subject, new environment, depth, and lighting continuity so the replacement looks natural.',
  },
  {
    category: 'Photo & Visual',
    id: 'festival-photo-prompts',
    question: 'Are there festival-ready gemini ai photo prompt templates?',
    answer:
      'Yes. We provide seasonal templates for Diwali, Holi, Navratri, Christmas, and more with matching color palettes and mood cues.',
  },
  {
    category: 'Photo & Visual',
    id: 'realistic-portrait-details',
    question: 'How do I make portraits look realistic instead of over-processed?',
    answer:
      'Use natural skin detail, balanced contrast, realistic facial proportions, and soft post-processing language in your prompt.',
  },
  {
    category: 'Photo & Visual',
    id: 'social-media-ratio',
    question: 'Can I mention social media framing like reel or post ratio?',
    answer:
      'Yes. Mention framing goals like vertical reel style, centered subject, and feed-ready composition to get platform-friendly outputs.',
  },
  {
    category: 'Photo & Visual',
    id: 'photo-style-transfer',
    question: 'Can I request style transfer in a gemini ai prompt?',
    answer:
      'Yes. You can specify vintage, cinematic, editorial, retro, or documentary styles while still keeping the subject and mood controlled.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'prompt-for-gemini-ai-girl',
    question: 'Where can I find a prompt for gemini ai girl?',
    answer:
      'You can browse our girl-focused prompt sets for festive, aesthetic, editorial, and portrait styles. Each prompt for gemini ai girl is designed to be ready-to-paste.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'prompt-for-gemini-ai-boy',
    question: 'Where can I find a prompt for gemini ai boy?',
    answer:
      'Check our boys prompt collections for gym, attitude, retro, and cinematic looks. Every prompt for gemini ai boy can be customized by outfit, location, and mood.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'gemini-prompts-for-boys',
    question: 'Do you provide gemini prompts for boys in trend-focused styles?',
    answer:
      'Yes. Our gemini prompts for boys cover street portraits, fitness aesthetics, bike edits, and social-media-ready visual themes.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'girls-aesthetic-prompts',
    question: 'Do you also have aesthetic girls prompt themes?',
    answer:
      'Yes. You can find soft aesthetic, festive, editorial, glam, and lifestyle style prompts designed for high-visual social content.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'outfit-pose-control',
    question: 'Can I control outfit, pose, and expression in boys and girls prompts?',
    answer:
      'Yes. Add explicit outfit details, body pose direction, expression, and camera framing to control the final look.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'gym-attitude-boy-prompts',
    question: 'Do you have gym and attitude prompt for gemini ai boy styles?',
    answer:
      'Yes. We provide gym, street, retro, and attitude templates tuned for prompt for gemini ai boy creator needs.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'saree-girl-prompts',
    question: 'Can I get traditional prompt for gemini ai girl edits like saree looks?',
    answer:
      'Yes. Our traditional sets include saree, festive, temple, and royal portrait themes with culturally relevant styling cues.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'couple-prompt-styles',
    question: 'Are couple prompts available for romantic and cinematic edits?',
    answer:
      'Yes. Couple prompt sets include romantic portraits, candid moods, travel scenes, and cinematic storytelling styles.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'avoid-over-edited-face',
    question: 'How do I avoid over-edited faces in boys and girls prompts?',
    answer:
      'Use natural skin texture, realistic proportions, subtle makeup terms, and balanced contrast instructions in your prompt.',
  },
  {
    category: 'Boys & Girls Prompts',
    id: 'youth-trend-styles',
    question: 'Do you update youth trend styles for boys and girls regularly?',
    answer:
      'Yes. We update modern looks based on trending creator formats so your visual style stays current across platforms.',
  },
  {
    category: 'Usage & Access',
    id: 'is-gemini-prompts-free',
    question: 'Are prompts on GeminiPrompts.io free to use?',
    answer:
      'Yes, many prompts are free, and we also offer premium prompt packs for deeper workflows and exclusive creator-ready prompt libraries.',
  },
  {
    category: 'Usage & Access',
    id: 'update-frequency',
    question: 'How often do you add new gemini prompt collections?',
    answer:
      'New prompts and categories are added every week so you can keep up with fresh trends, festival themes, and evolving creator styles.',
  },
  {
    category: 'Usage & Access',
    id: 'save-and-revisit-prompts',
    question: 'Can I save prompts and revisit them later?',
    answer:
      'Yes. Sign in to save prompts to your profile and quickly reopen them anytime from your saved prompts list.',
  },
  {
    category: 'Usage & Access',
    id: 'copy-paste-directly',
    question: 'Can I directly copy and paste prompts into Gemini AI?',
    answer:
      'Yes. All prompts are formatted for quick copy-paste use, and you can customize key details before running them.',
  },
  {
    category: 'Usage & Access',
    id: 'membership-vs-free',
    question: 'What is the difference between free and member-only prompts?',
    answer:
      'Free prompts cover broad creative needs, while membership unlocks exclusive prompt packs, advanced templates, and premium updates.',
  },
  {
    category: 'Usage & Access',
    id: 'client-work-usage',
    question: 'Can I use these prompts for client projects and brand content?',
    answer:
      'Yes. Many creators use our prompts for commercial-style drafts, campaign mockups, and client-facing visual ideation.',
  },
  {
    category: 'Usage & Access',
    id: 'language-support',
    question: 'Do prompts work only in English or in other languages too?',
    answer:
      'English gives the most stable output, but you can localize prompts and still get strong results by keeping structure clear.',
  },
  {
    category: 'Usage & Access',
    id: 'request-new-prompts',
    question: 'Can I request new prompt categories or styles?',
    answer:
      'Yes. You can share request ideas, and we prioritize categories based on demand, trend relevance, and creator workflows.',
  },
  {
    category: 'Usage & Access',
    id: 'mobile-usage',
    question: 'Can I use GeminiPrompts.io on mobile devices smoothly?',
    answer:
      'Yes. You can browse, copy, save, and open prompts on mobile and desktop with the same account workflow.',
  },
  {
    category: 'Usage & Access',
    id: 'low-quality-output-fix',
    question: 'What should I do if prompt output quality is low?',
    answer:
      'Refine the prompt with clearer subject details, style cues, and lighting context. Small targeted edits usually improve output fast.',
  },
];

type WatchReadListenCardViewModel = {
  id: string;
  slug: string;
  categorySlug: string | null;
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
    categorySlug: prompt.primaryCategory?.slug || prompt.categories[0]?.slug || null,
    title: prompt.title,
    author: prompt.author.name,
    date: formatDisplayDate(prompt.publishedAt || prompt.updatedAt),
    image: resolvePromptImage(prompt.image, prompt.slug || prompt.id),
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
    <article className="group relative rounded-[24px] border border-[#dfe2e8] bg-white p-[10px]">
      <Link
        href={card.categorySlug ? `/${card.categorySlug}/${card.slug}` : `/prompt/${card.slug}`}
        aria-label={`Open prompt: ${card.title}`}
        className="absolute inset-0 z-10 rounded-[24px]"
      />

      <div className="pointer-events-none relative z-20 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-stretch">
        <div
          className="order-1 relative h-[190px] overflow-hidden rounded-[24px] bg-cover bg-center"
          style={{ backgroundImage: `url(${card.image})` }}
        />

        <div className="order-2 flex flex-col">
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
            <span aria-hidden="true" className="text-[0.95rem] leading-none">
              •
            </span>
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
                  href={
                    card.categorySlug
                      ? `/${card.categorySlug}/${card.slug}#comments`
                      : `/prompt/${card.slug}#comments`
                  }
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
  const { sliderRef: categorySliderRef } = useDragSlider();
  const { sliderRef: trendingAuthorsSliderRef, dragHandlers: trendingAuthorsDragHandlers } =
    useDragSlider();
  const { sliderRef: recentlyUploadedSliderRef, dragHandlers: recentlyUploadedDragHandlers } =
    useDragSlider();
  const trendingPromptsSliderRef = useRef<HTMLDivElement | null>(null);
  const { data: session, status: sessionStatus, update } = useSafeSession();
  const updateSessionRef = useRef(update);
  const lastSessionRefreshAttemptRef = useRef(0);
  const followedAuthorsRequestRef = useRef(0);
  const followedPromptsRequestRef = useRef(0);
  const watchReadListenRequestRef = useRef(0);
  const watchReadListenSentinelRef = useRef<HTMLDivElement | null>(null);
  const carouselCards = [...heroCards, ...heroCards];
  const desktopCardHeight = 340;
  const mobileCardHeight = 160;
  const [openWhyChoose, setOpenWhyChoose] = useState('');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeFaqCategory, setActiveFaqCategory] = useState(homeFaqCategories[0] ?? 'General');
  const [openFaqId, setOpenFaqId] = useState('');
  const [homeContent, setHomeContent] = useState<HomeResponse | null>(initialHomeContent);
  const [isHomeContentLoading, setIsHomeContentLoading] = useState(!initialHomeContent);
  const [homeContentLoadError, setHomeContentLoadError] = useState<string | null>(null);
  const [watchReadListenPrompts, setWatchReadListenPrompts] = useState<PublicPrompt[]>(
    initialLatestPrompts?.items ?? [],
  );
  const [activeWatchReadListenCategory, setActiveWatchReadListenCategory] = useState<string>('all');
  const [isWatchReadListenLoadingInitial, setIsWatchReadListenLoadingInitial] =
    useState(!initialLatestPrompts);
  const [isWatchReadListenLoadingMore, setIsWatchReadListenLoadingMore] = useState(false);
  const [watchReadListenHasMore, setWatchReadListenHasMore] = useState(
    initialLatestPrompts
      ? initialLatestPrompts.items.length === watchReadListenInitialTake &&
          initialLatestPrompts.items.length < initialLatestPrompts.total
      : true,
  );
  const [watchReadListenLoadError, setWatchReadListenLoadError] = useState<string | null>(null);
  const [watchReadListenLoadMoreError, setWatchReadListenLoadMoreError] = useState<string | null>(
    null,
  );
  const [trendingAuthors, setTrendingAuthors] = useState<PublicAuthor[]>(
    initialTrendingAuthors?.items ?? [],
  );
  const [isTrendingAuthorsLoading, setIsTrendingAuthorsLoading] = useState(!initialTrendingAuthors);
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
  const [followedPromptsLoadMoreError, setFollowedPromptsLoadMoreError] = useState<string | null>(
    null,
  );
  const totalTestimonials = testimonials.length;
  const currentTestimonial = testimonials[activeTestimonial] ?? testimonials[0]!;

  useEffect(() => {
    updateSessionRef.current = update;
  }, [update]);
  const visibleFaqItems = faqItems.filter((item) => item.category === activeFaqCategory);
  const displayTrendingCategoriesFromHome =
    homeContent?.categories?.map((category) => ({
      slug: category.slug,
      title: category.name,
      articles: category.totalCount,
      image: resolveCategoryImage(category.imageUrl, category.slug || category.id),
    })) ?? [];
  const displayTrendingPrompts = homeContent?.trendingPrompts ?? [];
  const displayTrendingAuthors = trendingAuthors.map((author) => ({
    id: author.id,
    slug: author.slug,
    title: author.name,
    avatarUrl: author.avatarUrl,
    avatarUpdatedAt: author.avatarUpdatedAt,
    articles: author.totalCount ?? (author.promptCount ?? 0) + (author.postCount ?? 0),
  }));
  const displayRecentPosts =
    homeContent?.latestPosts?.map((post) => ({
      title: post.title,
      image: resolvePostImage(post.image, post.slug || post.id),
      readTime: estimateReadTime(post.excerpt || post.content),
      slug: post.slug,
    })) ?? [];
  const displayPopularTags = homeContent?.popularTags ?? [];
  const derivedTrendingCategories = useMemo(() => {
    const bySlug = new Map<
      string,
      { slug: string; title: string; articles: number; image: string }
    >();

    const addCategory = (slug?: string | null, name?: string | null, image?: string | null) => {
      if (!slug || !name) return;
      const resolvedImage = resolveCategoryImage(image, slug);

      const existing = bySlug.get(slug);
      if (existing) {
        bySlug.set(slug, {
          ...existing,
          articles: existing.articles + 1,
          image: existing.image || resolvedImage,
        });
        return;
      }

      bySlug.set(slug, {
        slug,
        title: name,
        articles: 1,
        image: resolvedImage,
      });
    };

    for (const prompt of watchReadListenPrompts) {
      const category = prompt.primaryCategory ?? prompt.categories?.[0] ?? null;
      addCategory(category?.slug, category?.name, prompt.image);
    }

    for (const prompt of displayTrendingPrompts) {
      const category = prompt.primaryCategory ?? prompt.categories?.[0] ?? null;
      addCategory(category?.slug, category?.name, prompt.image);
    }

    for (const post of homeContent?.latestPosts ?? []) {
      const category = post.primaryCategory ?? post.categories?.[0] ?? null;
      addCategory(category?.slug, category?.name, post.image);
    }

    return Array.from(bySlug.values())
      .sort((a, b) => b.articles - a.articles || a.title.localeCompare(b.title))
      .slice(0, 12);
  }, [displayTrendingPrompts, homeContent?.latestPosts, watchReadListenPrompts]);
  const displayTrendingCategories =
    displayTrendingCategoriesFromHome.length > 0
      ? displayTrendingCategoriesFromHome
      : derivedTrendingCategories;
  const topWatchReadListenCategories = useMemo(
    () =>
      [...displayTrendingCategories]
        .sort((a, b) => b.articles - a.articles)
        .slice(0, 5)
        .map((category) => ({
          slug: category.slug,
          title: category.title,
          totalCount: category.articles,
        })),
    [displayTrendingCategories],
  );
  const filteredWatchReadListenPrompts = useMemo(() => {
    if (activeWatchReadListenCategory === 'all') {
      return watchReadListenPrompts;
    }
    if (!activeWatchReadListenCategory) {
      return watchReadListenPrompts;
    }

    return watchReadListenPrompts.filter((prompt) => {
      const primarySlug = prompt.primaryCategory?.slug;
      if (primarySlug === activeWatchReadListenCategory) {
        return true;
      }
      return prompt.categories.some((category) => category.slug === activeWatchReadListenCategory);
    });
  }, [activeWatchReadListenCategory, watchReadListenPrompts]);
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
      if (data) {
        setHomeContent(data);
        return;
      }

      setHomeContent(null);
      setHomeContentLoadError('Could not load homepage content right now.');
    } catch {
      setHomeContent(null);
      setHomeContentLoadError('Could not load homepage content right now.');
    } finally {
      setIsHomeContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialHomeContent) {
      setHomeContent(initialHomeContent);
      setIsHomeContentLoading(false);
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
      setTrendingAuthors(initialTrendingAuthors.items);
      setIsTrendingAuthorsLoading(false);
      setTrendingAuthorsLoadError(null);
      return;
    }

    void loadTrendingAuthors();
  }, [initialTrendingAuthors, loadTrendingAuthors]);

  const loadWatchReadListenPrompts = useCallback(
    async ({ append, skip }: { append: boolean; skip: number }) => {
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
      setWatchReadListenPrompts(initialLatestPrompts.items);
      setWatchReadListenHasMore(initialLatestPrompts.items.length < initialLatestPrompts.total);
      setIsWatchReadListenLoadingInitial(false);
      setWatchReadListenLoadError(null);
      setWatchReadListenLoadMoreError(null);
      return;
    }

    void loadWatchReadListenPrompts({ append: false, skip: 0 });
  }, [initialLatestPrompts, loadWatchReadListenPrompts]);

  useEffect(() => {
    if (topWatchReadListenCategories.length === 0) {
      if (activeWatchReadListenCategory !== 'all') {
        setActiveWatchReadListenCategory('all');
      }
      return;
    }

    if (activeWatchReadListenCategory === 'all') {
      return;
    }

    const exists = topWatchReadListenCategories.some(
      (category) => category.slug === activeWatchReadListenCategory,
    );
    if (!exists) {
      setActiveWatchReadListenCategory(topWatchReadListenCategories[0]?.slug ?? 'all');
    }
  }, [activeWatchReadListenCategory, topWatchReadListenCategories]);

  useEffect(() => {
    const sentinel = watchReadListenSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        if (
          isWatchReadListenLoadingInitial ||
          isWatchReadListenLoadingMore ||
          !watchReadListenHasMore ||
          Boolean(watchReadListenLoadError) ||
          Boolean(watchReadListenLoadMoreError)
        ) {
          return;
        }

        void loadWatchReadListenPrompts({
          append: true,
          skip: watchReadListenPrompts.length,
        });
      },
      {
        root: null,
        rootMargin: '220px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    isWatchReadListenLoadingInitial,
    isWatchReadListenLoadingMore,
    watchReadListenHasMore,
    watchReadListenLoadError,
    watchReadListenLoadMoreError,
    watchReadListenPrompts.length,
    loadWatchReadListenPrompts,
  ]);

  const getSessionAccessToken = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      return null;
    }

    let accessToken = session?.apiAccessToken ?? null;
    if (accessToken && !isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
      return accessToken;
    }

    // Homepage followed-authors panel should not trigger session refresh loops.
    // If token is expired, fail quietly and let user re-auth through normal UX.
    if (Date.now() - lastSessionRefreshAttemptRef.current < 60_000) return null;
    const updater = updateSessionRef.current;
    if (!updater) return null;
    lastSessionRefreshAttemptRef.current = Date.now();
    const refreshed = await refreshSession(updater);
    accessToken = refreshed?.apiAccessToken ?? null;
    if (accessToken && !isAccessTokenExpired(refreshed?.apiAccessTokenExpiresAt ?? null)) {
      return accessToken;
    }

    return null;
  }, [session?.apiAccessToken, session?.apiAccessTokenExpiresAt, sessionStatus]);

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
    async ({ append, skip, take }: { append: boolean; skip: number; take: number }) => {
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
    if (sessionStatus !== 'authenticated') {
      void loadFollowedAuthors();
      return;
    }
    void loadFollowedAuthors();
  }, [sessionStatus, session?.user?.id, loadFollowedAuthors]);

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

    const firstCard = slider.querySelector<HTMLElement>('[data-category-pill]');
    const sliderStyles = window.getComputedStyle(slider);
    const gap = Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap || '0');
    const scrollAmount = firstCard ? firstCard.offsetWidth + gap : Math.round(slider.clientWidth * 0.72);

    slider.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  };

  const scrollTrendingPrompts = (direction: 'prev' | 'next') => {
    const slider = trendingPromptsSliderRef.current;
    if (!slider) {
      return;
    }

    const firstCard = slider.querySelector<HTMLElement>('[data-trending-prompt-card]');
    const sliderStyles = window.getComputedStyle(slider);
    const gap = Number.parseFloat(sliderStyles.columnGap || sliderStyles.gap || '0');
    const scrollAmount = firstCard ? firstCard.offsetWidth + gap : Math.round(slider.clientWidth * 0.86);

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
    <main className="homepage-headings w-full pb-8 pt-3 sm:pt-4">
      <section
        ref={heroRef}
        className="reveal-section relative overflow-visible py-6 text-center sm:overflow-hidden sm:py-12 lg:py-16"
      >
        <div className="page-container-wide px-4 sm:px-6 lg:px-8">
          <h1 className="hero-copy mx-auto mt-2 max-w-[22rem] px-1 text-[1.62rem] leading-[1.16] tracking-[-0.018em] text-[#111111] sm:max-w-[72rem] sm:text-[3rem] sm:tracking-[-0.04em] lg:text-[4.4rem]">
            <span className="block whitespace-nowrap">Gemini Prompt Library</span>
            <span className="block">Trending Gemini AI Prompt Ideas</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[48rem] text-[0.92rem] leading-6 text-[#5d6778] sm:mt-4 sm:text-[1rem] sm:leading-7">
            Explore a ready-to-use gemini prompt collection for photos, reels, boys, girls, and
            niche concepts like rare animals. Copy, paste, and create instantly.
          </p>
          <HeroSearchDropdown
            categories={homeContent?.categories ?? []}
            tags={homeContent?.popularTags ?? []}
            latestPrompts={homeContent?.latestPrompts ?? []}
            latestPosts={homeContent?.latestPosts ?? []}
            latestAuthors={trendingAuthors}
          />

          <div className="relative mt-4 h-[180px] w-full sm:mb-[-100px] sm:mt-6 sm:h-[430px] sm:-translate-y-[100px] lg:mt-8 lg:h-[470px]">
            <div className="absolute inset-x-0 bottom-0 h-[180px] overflow-hidden sm:h-[352px] lg:h-[384px]">
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
                      <div className="hero-stack-card relative h-full w-full overflow-hidden rounded-[30px]">
                        <Image
                          src={card.src}
                          alt={card.alt}
                          fill
                          sizes="(max-width: 1024px) 0px, 250px"
                          priority={index === 3}
                          loading={index === 3 ? 'eager' : 'lazy'}
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-gradient-to-r from-white via-white/45 to-transparent sm:block lg:w-20" />
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 bg-gradient-to-l from-white via-white/45 to-transparent sm:block lg:w-20" />

              <div className="hero-carousel hero-carousel-mask absolute inset-x-0 bottom-0 overflow-hidden sm:hidden">
                <div className="hero-carousel-track flex w-max items-end gap-2.5 pb-2 pt-3">
                  {carouselCards.map((card, index) => (
                    <div
                      key={`${card.src}-mobile-${index}`}
                      className="hero-carousel-item relative w-[146px] shrink-0 cursor-pointer"
                      style={{ height: `${mobileCardHeight}px` }}
                    >
                      <div className="hero-stack-card relative h-full w-full overflow-hidden rounded-[22px]">
                        <Image
                          src={card.src}
                          alt={card.alt}
                          fill
                          sizes="168px"
                          priority={index === 3}
                          loading={index === 3 ? 'eager' : 'lazy'}
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white/35 to-transparent sm:hidden" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/35 to-transparent sm:hidden" />
            </div>
          </div>

        </div>
      </section>

      {/* Start counter section */}
      <section className="bg-[#f8f8f8] px-4 py-10 sm:px-6 sm:py-10 lg:px-8 lg:py-10">
        <div className="page-container-wide grid gap-8 lg:grid-cols-[0.4fr_0.6fr] lg:items-center lg:gap-10">
          
          {/* Left: Heading and description */}
          <div className="flex w-full flex-col gap-5">
            <h2 className="font-poppins text-[2rem] font-medium tracking-[-0.04em] text-[#101010] sm:text-[2.5rem] lg:text-[3rem] lg:leading-[1.2]">
              Find the Right Gemini Prompt in Seconds
            </h2>
            <p className="w-full text-[0.95rem] leading-[1.55] text-[#5f6773] sm:text-[1rem]">
              Discover gemini ai prompt ideas for photo edits, captions, reels, and creator content.
              Search by style and instantly start with ready-to-use prompt formats.
            </p>
          </div>

          {/* Right: Counters */}
          <div className="flex w-full items-center pt-3 sm:pt-4 lg:justify-self-start lg:pt-0">
            <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6">
            <motion.div
              whileInView={{ y: [30, 0], opacity: [0, 1] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <AnimatedCounter
                value="5k+"
                className="font-poppins text-[3rem] font-light leading-[0.92] tracking-[-0.06em] text-[#101010] sm:text-[5rem]"
              />
              <span className="mt-6 text-[1rem] font-normal leading-[1.2] tracking-[-0.03em] text-[#101010] sm:text-[1.05rem]">
                Prompts
              </span>
            </motion.div>
            <motion.div
              whileInView={{ y: [30, 0], opacity: [0, 1] }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              viewport={{ once: true, amount: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <AnimatedCounter
                value="100k+"
                className="font-poppins text-[3rem] font-light leading-[0.92] tracking-[-0.06em] text-[#101010] sm:text-[5rem]"
              />
              <span className="mt-6 text-[1rem] font-normal leading-[1.2] tracking-[-0.03em] text-[#101010] sm:text-[1.05rem]">
                All Users
              </span>
            </motion.div>
            <motion.div
              whileInView={{ y: [30, 0], opacity: [0, 1] }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              viewport={{ once: true, amount: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <AnimatedCounter
                value="49k+"
                className="font-poppins text-[3rem] font-light leading-[0.92] tracking-[-0.06em] text-[#101010] sm:text-[5rem]"
              />
              <span className="mt-6 text-[1rem] font-normal leading-[1.2] tracking-[-0.03em] text-[#101010] sm:text-[1.05rem]">
                Subscribers
              </span>
            </motion.div>
            <motion.div
              whileInView={{ y: [30, 0], opacity: [0, 1] }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
              viewport={{ once: true, amount: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <AnimatedCounter
                value="100+"
                className="font-poppins text-[3rem] font-light leading-[0.92] tracking-[-0.06em] text-[#101010] sm:text-[5rem]"
              />
              <span className="mt-6 text-[1rem] font-normal leading-[1.2] tracking-[-0.03em] text-[#101010] sm:text-[1.05rem]">
                Posts
              </span>
            </motion.div>
            </div>
          </div>
        </div>
      </section>
      {/* End counter section */}

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[1.85rem] font-medium leading-[1.06] tracking-[-0.05em] text-[#101010] sm:text-[2.4rem]">
              Trending Gemini Prompt Categories
            </h2>
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/category"
                className="inline-flex h-[48px] items-center justify-center rounded-full border border-[#e5e8ef] bg-white px-5 text-[0.95rem] font-medium text-[#111111] transition-colors hover:border-[#cfd5df] hover:bg-[#f7f9fc]"
              >
                Explore all Categories
              </Link>
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scrollCategories('prev')}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#e5e8ef] bg-white text-[#161a22] transition-colors hover:border-[#cfd5df] hover:bg-[#f7f9fc]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M14.5 5.5 8 12l6.5 6.5"
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
                aria-label="Scroll categories right"
                onClick={() => scrollCategories('next')}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#e5e8ef] bg-white text-[#161a22] transition-colors hover:border-[#cfd5df] hover:bg-[#f7f9fc]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M9.5 5.5 16 12l-6.5 6.5"
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

          <div
            ref={categorySliderRef}
            className="no-scrollbar mt-6 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto pb-2 sm:mt-8 sm:gap-3"
          >
            {isHomeContentLoading ? (
              Array.from({ length: categorySkeletonCount }).map((_, index) => (
                <div
                  key={`category-skeleton-${index}`}
                  className="flex w-[68vw] min-w-[14rem] max-w-[18rem] shrink-0 snap-start items-center gap-3 rounded-full border border-[#ebedf2] bg-white px-3 py-2.5 sm:w-auto sm:min-w-0 sm:max-w-none"
                >
                  <Skeleton className="h-[46px] w-[46px] !rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4.5 w-24 rounded-full" />
                    <Skeleton className="h-3.5 w-14 rounded-full" />
                  </div>
                </div>
              ))
            ) : displayTrendingCategories.length > 0 ? (
              displayTrendingCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  data-category-pill
                  className="flex w-[68vw] min-w-[14rem] max-w-[18rem] shrink-0 snap-start items-center justify-between gap-3 rounded-full border border-[#e9ebf1] bg-white px-[8px] py-[8px] transition-colors hover:border-[#cfd5df] hover:bg-[#fafbfe] sm:w-auto sm:min-w-0 sm:max-w-none sm:justify-start"
                  aria-label={`Open ${category.title} category`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-[46px] w-[46px] overflow-hidden rounded-full border border-[#eceff5]">
                      <Image
                        src={category.image}
                        alt={`${category.title} icon`}
                        fill
                        sizes="46px"
                        loading="lazy"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <span className="truncate whitespace-nowrap text-[0.98rem] font-medium text-[#191c22]">
                      {category.title}
                    </span>
                  </div>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f1f3f7] px-2.5 whitespace-nowrap text-[0.88rem] font-medium text-[#8d95a3]">
                    {formatCompactCount(category.articles)}
                  </span>
                </Link>
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
            ) : (
              <div className="flex min-h-[180px] w-full items-center justify-center rounded-[28px] border border-dashed border-[#d8dce2] bg-[#fafbfc] px-6 text-center text-[0.95rem] text-[#6a7280]">
                No categories published yet.
              </div>
            )}
          </div>

          <div className="mt-4 flex w-full items-center gap-2.5 sm:hidden">
            <Link
              href="/category"
              className="inline-flex h-[44px] flex-1 items-center justify-center rounded-full border border-[#e5e8ef] bg-white px-4 text-[0.88rem] font-medium text-[#111111] transition-colors hover:border-[#cfd5df] hover:bg-[#f7f9fc]"
            >
              Explore all Categories
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scrollCategories('prev')}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#e5e8ef] bg-white text-[#161a22] transition-colors hover:border-[#cfd5df] hover:bg-[#f7f9fc]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M14.5 5.5 8 12l6.5 6.5"
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
                aria-label="Scroll categories right"
                onClick={() => scrollCategories('next')}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#e5e8ef] bg-white text-[#161a22] transition-colors hover:border-[#cfd5df] hover:bg-[#f7f9fc]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M9.5 5.5 16 12l-6.5 6.5"
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
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h2 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]">
              Trending Gemini AI Prompts
            </h2>
            <div className="flex w-full items-center gap-2.5 sm:w-auto sm:gap-3">
              <Link
                href="/prompts"
                className="whitespace-nowrap rounded-full border border-[#d8dce2] bg-white px-4 py-2 text-[0.88rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white sm:px-6 sm:py-3 sm:text-[1rem]"
              >
                Explore all prompts
              </Link>
              <div className="hidden items-center gap-2.5 sm:flex sm:gap-3">
                <button
                  type="button"
                  onClick={() => scrollTrendingPrompts('prev')}
                  aria-label="Scroll trending prompts left"
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#dfe3ea] bg-white text-[#12161c] transition-colors hover:border-[#cfd5df] hover:bg-[#f8f9fb]"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                    <path
                      d="M11.75 4.5 6.25 10l5.5 5.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.9"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => scrollTrendingPrompts('next')}
                  aria-label="Scroll trending prompts right"
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#dfe3ea] bg-white text-[#12161c] transition-colors hover:border-[#cfd5df] hover:bg-[#f8f9fb]"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                    <path
                      d="M8.25 4.5 13.75 10l-5.5 5.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.9"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div
            ref={trendingPromptsSliderRef}
            className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:mt-7 sm:gap-6 lg:gap-7"
          >
            {isHomeContentLoading ? (
              Array.from({ length: trendingPromptSkeletonCount }).map((_, index) => (
                <article
                  key={`trending-prompt-skeleton-${index}`}
                  className="w-[88vw] max-w-[20rem] shrink-0 snap-start rounded-[24px] bg-transparent sm:w-[20rem] sm:max-w-none lg:w-[22rem]"
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
              <div className="w-full shrink-0 rounded-[22px] border border-[#e2e6ee] px-6 py-7 text-center">
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
                <div
                  key={prompt.id}
                  data-trending-prompt-card
                  className="w-[88vw] max-w-[20rem] shrink-0 snap-start sm:w-[20rem] sm:max-w-none lg:w-[22rem]"
                >
                  <PromptCardUI prompt={prompt} />
                </div>
              ))
            ) : (
              <div className="w-full shrink-0 rounded-[22px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
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
                                href={`/u/${group.author.slug}`}
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
                      <p className="text-[0.9rem] text-[#667284]">
                        You have reached the latest prompts.
                      </p>
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
              <h2 className="section-heading-medium text-[2rem] leading-[0.96] tracking-[-0.07em] text-[#080808] sm:text-[2.25rem] lg:text-[2.5rem]">
                Why Choose GeminiPrompts.io
              </h2>
              <p className="mt-4 max-w-[36rem] text-[0.98rem] leading-7 text-[#5d636c] sm:mt-5 sm:text-[1.08rem] sm:leading-8">
                Build better output with a focused gemini prompt library. From prompt for gemini ai
                girl and prompt for gemini ai boy to gemini ai photo prompt workflows, every block
                is designed for practical creator use.
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
                        onClick={() =>
                          setOpenWhyChoose((current) => (current === item.title ? '' : item.title))
                        }
                        className="flex w-full items-center justify-between gap-4 py-7 text-left sm:py-8"
                      >
                        <span className="pr-4 text-[1.12rem] leading-[1.08] tracking-[-0.035em] text-[#111111] sm:text-[1.32rem]">
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

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:mt-6 xl:grid-cols-4 xl:gap-6">
            {benefitCards.map((card, index) => (
              <article
                key={card.title}
                className={`${card.tone} relative flex min-h-[220px] flex-col overflow-hidden rounded-[24px] p-5 sm:min-h-[248px] sm:rounded-[28px] sm:p-7`}
              >
                {index < 3 ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-2 text-[4.2rem] font-semibold leading-none tracking-[-0.06em] text-[#101010]/10 sm:right-5 sm:top-3 sm:text-[5rem]"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                ) : null}
                <h3 className="max-w-[12rem] text-[1.75rem] leading-[1.05] tracking-[-0.05em] text-[#090909] sm:text-[2rem]">
                  {card.title}
                </h3>
                <p className="mt-6 max-w-[16rem] text-[0.98rem] leading-7 text-[#5f6773] sm:mt-8 sm:text-[1rem] sm:leading-8">
                  {card.description}
                </p>
              </article>
            ))}

            <article
              className="relative min-h-[220px] overflow-hidden rounded-[24px] bg-cover bg-center p-5 sm:min-h-[248px] sm:rounded-[30px] sm:p-7"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1200)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172acc] via-[#0f172a26] to-transparent" />
              <div className="relative z-10 flex h-full min-h-[196px] flex-col justify-end sm:min-h-[220px]">
                <h3 className="max-w-[10rem] text-[2.5rem] leading-[0.95] tracking-[-0.06em] text-white sm:text-[3.6rem]">
                  Gemini Prompt Trends
                </h3>
              </div>
              <div className="absolute bottom-4 right-4 z-10 flex h-[92px] w-[92px] items-center justify-center bg-[#ff6631] text-center text-[0.88rem] font-medium uppercase leading-tight text-white [clip-path:polygon(50%_0%,61%_24%,86%_7%,74%_32%,100%_34%,77%_50%,100%_66%,74%_68%,86%_93%,61%_76%,50%_100%,39%_76%,14%_93%,26%_68%,0%_66%,23%_50%,0%_34%,26%_32%,14%_7%,39%_24%)] sm:bottom-5 sm:right-5 sm:h-[118px] sm:w-[118px] sm:text-[1rem]">
                NEW
                <br />
                WEEKLY
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex items-center justify-between gap-4">
            <h2 className="section-heading-medium text-[1.65rem] leading-[1.06] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]">
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
                  href={`/u/${author.slug}`}
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
            <h2 className="section-heading-medium max-w-[11ch] text-[2.25rem] leading-[0.96] tracking-[-0.07em] text-[#0f0f0f] sm:text-[2.6rem] lg:text-[4rem]">
              Best Prompt Packs Curated For You
            </h2>
            <p className="mt-6 max-w-[26rem] text-[1rem] leading-8 text-[#2a3010] sm:text-[1.08rem]">
              For creators who want faster ideation, stronger outputs, and a polished starting point
              for every launch.
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
                backgroundImage: `url(${CTA_ROBO_URL})`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="section-heading-medium text-[1.45rem] leading-[1.2] tracking-[-0.03em] text-[#111111] sm:text-[2.25rem] sm:tracking-[-0.04em] lg:text-[2.5rem]">
              <span className="text-[#111111]">More posts.</span>{' '}
              <span className="text-[#687082]">You may also be interested in.</span>
            </h2>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Link
                href="/blog"
                className="rounded-full border border-[#d5d8de] bg-white px-4 py-2 text-[0.86rem] text-[#111111] transition-colors duration-300 hover:border-[#111111] hover:bg-[#111111] hover:text-white sm:px-5 sm:py-2.5 sm:text-[0.96rem]"
              >
                Explore All Blogs
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
                  className="w-[260px] shrink-0 snap-start sm:w-[320px] lg:w-[calc((100%-3.75rem)/4)]"
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
                  className="w-[260px] shrink-0 snap-start sm:w-[320px] lg:w-[calc((100%-3.75rem)/4)]"
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
                <span className="block">From image</span>
                <span className="block">creators.</span>
              </h2>

              <p className="mt-6 max-w-[22rem] text-[1.05rem] leading-[1.7] text-[#1c1c1c] sm:text-[1.18rem] lg:mt-8 lg:text-[1.28rem]">
                Honest feedback from members using Gemini Prompts for portraits, reels, edits, and
                daily visual content.
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
            <h2 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.06em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]">
              You will find yourself among us
            </h2>
            <p className="mx-auto mt-5 max-w-[29rem] text-[1.03rem] leading-8 text-[#5f6773] sm:text-[1.12rem]">
              Dive into a dynamic community where creators and buyers seamlessly merge through bold
              ideas, visual inspiration, and trusted prompt craft.
            </p>
            <Link
              href="/membership"
              className="mt-7 inline-flex rounded-full bg-[#101010] px-7 py-3 text-[1rem] font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              Join community
            </Link>
          </div>

          <div className="community-strip mt-10 sm:mt-12">
            <div
              className="community-track community-track-reverse"
              style={{ animationDuration: '44s' }}
            >
              {[0, 1].map((groupIndex) => (
                <div key={`community-bottom-${groupIndex}`} className="community-row">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.05em] text-[#101010] sm:text-[2.25rem] lg:text-[2.5rem]">
              Watch, Read, Listen
            </h2>
            {topWatchReadListenCategories.length > 0 ? (
              <div className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveWatchReadListenCategory('all')}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.86rem] transition-colors ${
                    activeWatchReadListenCategory === 'all'
                      ? 'border-[#101317] bg-[#101317] text-white'
                      : 'border-[#d9dde5] bg-white text-[#1b2230] hover:border-[#c8ceda] hover:bg-[#f6f8fc]'
                  }`}
                >
                  All
                </button>
                {topWatchReadListenCategories.map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => setActiveWatchReadListenCategory(category.slug)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.86rem] transition-colors ${
                      activeWatchReadListenCategory === category.slug
                        ? 'border-[#101317] bg-[#101317] text-white'
                        : 'border-[#d9dde5] bg-white text-[#1b2230] hover:border-[#c8ceda] hover:bg-[#f6f8fc]'
                    }`}
                  >
                    {category.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-7 grid gap-x-6 gap-y-6 lg:grid-cols-2 lg:gap-x-7 lg:gap-y-7">
            {isWatchReadListenLoadingInitial && watchReadListenPrompts.length === 0
              ? Array.from({ length: watchReadListenSkeletonCount }).map((_, index) => (
                  <article
                    key={`watch-read-listen-skeleton-${index}`}
                    className="rounded-[20px] border border-[#dfe2e8] bg-white p-[10px]"
                  >
                    <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-stretch">
                      <Skeleton className="h-[190px] rounded-[20px]" />
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
                    </div>
                  </article>
                ))
              : filteredWatchReadListenPrompts.map((prompt) => (
                  <WatchReadListenPromptCard key={prompt.id} prompt={prompt} />
                ))}
          </div>

          {!isWatchReadListenLoadingInitial &&
          watchReadListenPrompts.length === 0 &&
          watchReadListenLoadError ? (
            <div className="mt-7">
              <div className="grid gap-x-6 gap-y-6 lg:grid-cols-2 lg:gap-x-7 lg:gap-y-7">
                {Array.from({ length: watchReadListenSkeletonCount }).map((_, index) => (
                  <article
                    key={`watch-read-listen-retry-skeleton-${index}`}
                    className="rounded-[20px] border border-[#dfe2e8] bg-white p-[10px]"
                  >
                    <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-stretch">
                      <Skeleton className="h-[190px] rounded-[20px]" />
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
          filteredWatchReadListenPrompts.length === 0 &&
          !watchReadListenLoadError ? (
            <div className="mt-7 rounded-[20px] border border-dashed border-[#d8dee8] px-5 py-6 text-[0.96rem] text-[#677386]">
              {activeWatchReadListenCategory === 'all'
                ? 'No prompts available yet.'
                : 'No prompts in this category yet.'}
            </div>
          ) : null}

          {watchReadListenPrompts.length > 0 ? (
            <div ref={watchReadListenSentinelRef} className="mt-6 h-px w-full" aria-hidden="true" />
          ) : null}

          {isWatchReadListenLoadingMore ? (
            <div className="mt-5 flex justify-center">
              <p className="text-[0.92rem] text-[#566173]">Loading more prompts...</p>
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

      <section className="reveal-section px-4 pb-4 pt-10 sm:px-6 sm:pb-6 sm:pt-12 lg:px-8 lg:pb-8 lg:pt-14">
        <div className="page-container-wide rounded-[30px] bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mx-auto max-w-[47rem] text-center">
            <h2 className="section-heading-medium text-[2rem] leading-[1.06] tracking-[-0.05em] text-[#111827] sm:text-[2.25rem] lg:text-[2.5rem]">
              Real Image Use Cases
            </h2>
            <p className="mx-auto mt-4 max-w-[44rem] text-[0.98rem] leading-7 text-[#667085] sm:text-[1.04rem]">
              See how creators use Gemini Prompts to plan concepts, generate better visuals, and
              get consistent image results with less guesswork.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-5">
            {useCaseCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[24px] border border-transparent bg-[#fbfcff] px-5 py-6 transition-colors duration-200 hover:border-[#111111] sm:px-6"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#eef2f8] text-[#4a5568]">
                  {renderUseCaseIcon(card.icon)}
                </div>
                <h3 className="mt-5 text-[1.5rem] leading-[1.22] tracking-[-0.03em] text-[#151923]">
                  {card.title}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-8 text-[#5b6577]">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal-section px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="page-container-wide rounded-[30px] border border-[#e6e9ef] bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="text-center">
            <h2 className="section-heading-medium text-[2rem] leading-[1.08] tracking-[-0.05em] text-[#111827] sm:text-[2.25rem] lg:text-[2.5rem]">
              Gemini Prompt FAQs
            </h2>
            <p className="mx-auto mt-4 max-w-[46rem] text-[0.98rem] leading-7 text-[#7a8191] sm:text-[1.05rem]">
              Learn how to use every gemini prompt faster, from google gemini prompt basics to
              gemini ai photo prompt styles for boys, girls, and creative niche concepts.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-10">
            <aside className="rounded-[18px] border border-[#eceff4] bg-[#fafbfd] p-4 sm:p-5">
              <p className="text-[1.1rem] leading-none text-[#161b24] sm:text-[1.18rem]">
                Table of Contents
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {homeFaqCategories.map((category: string) => {
                  const isActive = activeFaqCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setFaqCategory(category)}
                      className={`w-full rounded-[10px] px-3 py-2 text-left text-[0.96rem] transition-colors sm:text-[1rem] ${isActive ? 'bg-[#d5ea52] text-[#101010]' : 'text-[#101010] hover:bg-[#f2f4f8]'}`}
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
                      <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#d5ea52] text-[1.15rem] leading-none text-[#101010]">
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
