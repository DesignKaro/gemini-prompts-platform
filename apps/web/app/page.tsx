import { getAuthorList, getHomeContent, getPromptList } from '../lib/public-content';
import { buildMetadata, getBaseUrl, getSeoSettings } from '../lib/seo';
import {
  buildFaqSchema,
  buildItemListSchema,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../lib/structured-data';
import { SeoSchemaScripts } from './components/seo-schema-script';
import HomePageClient from './home-page-client';

const WATCH_READ_LISTEN_INITIAL_TAKE = 8;
const TRENDING_AUTHOR_TAKE = 12;
const HOMEPAGE_PRIMARY_KEYWORDS = [
  'gemini prompt',
  'gemini ai prompt',
  'google gemini prompt',
  'prompt for gemini',
  'gemini ai photo prompt',
  'prompt seen',
  'prompt for gemini ai girl',
  'prompt for gemini ai boy',
  'gemini prompts for boys',
  'rare animals',
];

const HOMEPAGE_FAQ_SCHEMA_ITEMS = [
  {
    question: 'What is a gemini prompt and how do I use it?',
    answer:
      'A gemini prompt is a ready instruction you paste into Gemini AI to get the output style you want. Pick a prompt, customize details like mood or scene, then run it in Gemini.',
  },
  {
    question: 'Is a gemini ai prompt different from a normal prompt?',
    answer:
      'A strong gemini ai prompt uses clear context, style, and constraints so Gemini can generate more accurate and consistent outputs.',
  },
  {
    question: 'Can I use the same google gemini prompt in ChatGPT or Midjourney?',
    answer:
      'You can reuse the base idea, but each model performs best with slight format changes tailored to text or image outputs.',
  },
  {
    question: 'Which gemini ai photo prompt works best for realistic edits?',
    answer:
      'Use prompts with lighting direction, lens style, texture detail, and scene context for realistic image results.',
  },
  {
    question: 'Where can I find prompt for gemini ai girl or prompt for gemini ai boy?',
    answer:
      'GeminiPrompts.io has dedicated collections for girl and boy styles including aesthetic, festive, cinematic, gym, and retro looks.',
  },
];

export async function generateMetadata() {
  const settings = await getSeoSettings();
  const metadata = await buildMetadata({
    title:
      settings.homepageTitle ||
      'Gemini Prompt Library: Gemini AI Prompt Ideas for Photos, Boys, Girls & More',
    description:
      settings.homepageDescription ||
      'Explore every Gemini prompt style in one place: gemini ai prompt ideas, google gemini prompt guides, gemini ai photo prompt examples, and trending prompts for boys, girls, and more.',
    path: '/',
  });

  return {
    ...metadata,
    keywords: HOMEPAGE_PRIMARY_KEYWORDS,
  };
}

export default async function HomePage() {
  const [settings, initialHomeContent, initialLatestPrompts, initialTrendingAuthors] =
    await Promise.all([
      getSeoSettings(),
      getHomeContent(),
      getPromptList({
        sort: 'latest',
        take: WATCH_READ_LISTEN_INITIAL_TAKE,
        includeTags: 1,
      }),
      getAuthorList({
        take: TRENDING_AUTHOR_TAKE,
        sort: 'popular',
      }),
    ]);

  const baseUrl = getBaseUrl(settings);
  const homepageUrl = `${baseUrl}/`;
  const featuredPrompts = [
    ...initialLatestPrompts.items,
    ...(initialHomeContent?.trendingPrompts ?? []),
  ];
  const uniqueFeaturedPrompts = Array.from(
    new Map(featuredPrompts.map((prompt) => [prompt.id, prompt])).values(),
  ).slice(0, 16);

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: homepageUrl,
        name: 'Gemini Prompt Library',
        description:
          'Gemini Prompt library with trending Gemini AI prompts, photo prompts, and style collections for creators.',
        keywords: HOMEPAGE_PRIMARY_KEYWORDS,
      }),
    },
    {
      family: 'faq' as const,
      schema: buildFaqSchema(homepageUrl, HOMEPAGE_FAQ_SCHEMA_ITEMS),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: homepageUrl,
        name: 'Featured Gemini prompts',
        idSuffix: 'featured-prompts',
        items: buildPromptItemListEntries(uniqueFeaturedPrompts, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} />
      <HomePageClient
        initialHomeContent={initialHomeContent}
        initialLatestPrompts={initialLatestPrompts}
        initialTrendingAuthors={initialTrendingAuthors}
      />
    </>
  );
}
