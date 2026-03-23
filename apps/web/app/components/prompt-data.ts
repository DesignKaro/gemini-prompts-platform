export type PromptCard = {
  id: string;
  title: string;
  category: string;
  image: string;
  likes: number;
  comments: number;
  author: string;
  date: string;
  /** ISO date string for sorting */
  isoDate: string;
};

export type SortKey = 'newest' | 'oldest' | 'most-liked' | 'most-commented';

export const SEED_PROMPTS: Omit<PromptCard, 'id'>[] = [
  {
    title: 'Cold Email Opener That Gets Replies',
    category: 'Marketing',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 312,
    comments: 18,
    author: 'StudioLab',
    date: 'Mar 14, 2025',
    isoDate: '2025-03-14T00:00:00Z',
  },
  {
    title: 'Product Launch Copy — Full Framework',
    category: 'Business',
    image:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 278,
    comments: 14,
    author: 'SignalForge',
    date: 'Mar 10, 2025',
    isoDate: '2025-03-10T00:00:00Z',
  },
  {
    title: 'Blog Post Outline Generator (SEO-First)',
    category: 'Writing',
    image:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 241,
    comments: 11,
    author: 'VisionGrid',
    date: 'Mar 08, 2025',
    isoDate: '2025-03-08T00:00:00Z',
  },
  {
    title: 'UI Audit Prompt for Pixel-Perfect Design',
    category: 'Design',
    image:
      'https://images.unsplash.com/photo-1593376893114-1aed528d80cf?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 198,
    comments: 9,
    author: 'FrameFlow',
    date: 'Mar 05, 2025',
    isoDate: '2025-03-05T00:00:00Z',
  },
  {
    title: 'SaaS Growth Loop Prompt Pack',
    category: 'Technology',
    image:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 423,
    comments: 26,
    author: 'NextPrompt',
    date: 'Mar 02, 2025',
    isoDate: '2025-03-02T00:00:00Z',
  },
  {
    title: 'Instagram Caption Pack for Creators',
    category: 'Marketing',
    image:
      'https://images.unsplash.com/photo-1517292987719-0369a794ec0f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 387,
    comments: 22,
    author: 'CreatorOS',
    date: 'Feb 28, 2025',
    isoDate: '2025-02-28T00:00:00Z',
  },
  {
    title: 'Sales Page Framework — B2B SaaS',
    category: 'Business',
    image:
      'https://images.unsplash.com/photo-1445648750294-a97dcc7e1e2f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 356,
    comments: 19,
    author: 'CopySprint',
    date: 'Feb 24, 2025',
    isoDate: '2025-02-24T00:00:00Z',
  },
  {
    title: 'YouTube Script Template for Short Videos',
    category: 'Writing',
    image:
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 302,
    comments: 15,
    author: 'StoryArc',
    date: 'Feb 20, 2025',
    isoDate: '2025-02-20T00:00:00Z',
  },
  {
    title: 'Data Analysis Prompt for Exec Briefs',
    category: 'Technology',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 265,
    comments: 12,
    author: 'InsightLab',
    date: 'Feb 15, 2025',
    isoDate: '2025-02-15T00:00:00Z',
  },
  {
    title: 'Creative Brief Generator for Agencies',
    category: 'Design',
    image:
      'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 312,
    comments: 17,
    author: 'BooliiTheme',
    date: 'Feb 10, 2025',
    isoDate: '2025-02-10T00:00:00Z',
  },
  {
    title: 'Startup Pitch Deck Story Framework',
    category: 'Business',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 289,
    comments: 13,
    author: 'PromptNexus',
    date: 'Feb 05, 2025',
    isoDate: '2025-02-05T00:00:00Z',
  },
  {
    title: 'SEO Meta Description Generator',
    category: 'Marketing',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 178,
    comments: 8,
    author: 'InsightLoop',
    date: 'Jan 30, 2025',
    isoDate: '2025-01-30T00:00:00Z',
  },
  {
    title: 'Reels Hook Library — 30 Openers',
    category: 'Writing',
    image:
      'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 445,
    comments: 31,
    author: 'CreatorOS',
    date: 'Jan 25, 2025',
    isoDate: '2025-01-25T00:00:00Z',
  },
  {
    title: 'React Refactor Prompt for Legacy Code',
    category: 'Technology',
    image:
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 402,
    comments: 24,
    author: 'CodeHarbor',
    date: 'Jan 20, 2025',
    isoDate: '2025-01-20T00:00:00Z',
  },
  {
    title: 'Onboarding Email Sequence (7-Touch)',
    category: 'Marketing',
    image:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 367,
    comments: 20,
    author: 'VisionGrid',
    date: 'Jan 15, 2025',
    isoDate: '2025-01-15T00:00:00Z',
  },
  {
    title: 'AI Workflow Builder for No-Code Teams',
    category: 'Technology',
    image:
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400',
    likes: 331,
    comments: 16,
    author: 'SignalForge',
    date: 'Jan 10, 2025',
    isoDate: '2025-01-10T00:00:00Z',
  },
];

export const ALL_CATEGORIES = Array.from(new Set(SEED_PROMPTS.map((p) => p.category))).sort();

export function buildAllPrompts(multiplier = 3): PromptCard[] {
  const total = SEED_PROMPTS.length * multiplier;
  return Array.from({ length: total }, (_, i) => {
    const seed = SEED_PROMPTS[i % SEED_PROMPTS.length]!;
    const offsetDays = Math.floor(i / SEED_PROMPTS.length) * 30;
    const baseDate = new Date(seed.isoDate);
    baseDate.setDate(baseDate.getDate() - offsetDays);
    return {
      ...seed,
      id: `prompt-${i + 1}`,
      likes: Math.max(18, seed.likes - offsetDays),
      comments: Math.max(1, seed.comments - Math.floor(offsetDays / 10)),
      isoDate: baseDate.toISOString(),
      date: baseDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  });
}

export function sortPrompts(prompts: PromptCard[], sort: SortKey): PromptCard[] {
  const copy = [...prompts];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    case 'oldest':
      return copy.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    case 'most-liked':
      return copy.sort((a, b) => b.likes - a.likes);
    case 'most-commented':
      return copy.sort((a, b) => b.comments - a.comments);
    default:
      return copy;
  }
}
