import Link from 'next/link';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

type FooterIconLink = FooterLink & {
  icon: React.ReactNode;
};

const EMAIL_ADDRESS = 'help@geminiprompts.io';

const footerSections: FooterSection[] = [
  {
    title: 'Menu',
    links: [
      { href: '/about', label: 'About' },
      { href: '/category', label: 'Categories' },
      { href: '/author', label: 'Authors' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Prompts',
    links: [
      { href: '/prompts', label: 'All Prompts' },
      { href: '/exclusive', label: 'Exclusive' },
      { href: '/membership', label: 'Membership' },
      { href: '/newsletter', label: 'Newsletter' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/help', label: 'Help' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy-policy', label: 'Privacy Policy' },
    ],
  },
];

const contactLinks: FooterIconLink[] = [
  {
    href: 'https://www.instagram.com/geminiprompts.io?igsh=MW5qOTZwdHJlMHhvYQ==',
    label: 'Instagram',
    external: true,
    icon: <FaInstagram aria-hidden="true" className="h-[18px] w-[18px]" />,
  },
  {
    href: 'https://chat.whatsapp.com/El7eMYNAAF5EOhWKvDCl6n?mode=gi_t',
    label: 'WhatsApp',
    external: true,
    icon: <FaWhatsapp aria-hidden="true" className="h-[18px] w-[18px]" />,
  },
  {
    href: `mailto:${EMAIL_ADDRESS}`,
    label: 'Email',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M4.5 7.5h15v9h-15v-9Zm0 0L12 13l7.5-5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const legalLinks: FooterLink[] = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
];

function FooterLinkItem({
  href,
  label,
  external,
  className = '',
}: FooterLink & { className?: string }) {
  const sharedClassName = `${className}`.trim();

  if (external || href.startsWith('mailto:')) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className={sharedClassName}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={sharedClassName}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="overflow-hidden bg-[#151515] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-6 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pb-8 lg:pt-14">
        <div className="grid grid-cols-2 gap-12 lg:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,0.48fr))] lg:gap-x-10 xl:gap-x-14">
          <div className="col-span-2 max-w-[31rem] lg:col-span-1">
            <div className="flex flex-wrap gap-3">
              {contactLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noreferrer' : undefined}
                  aria-label={link.label}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/45 text-white/88 transition hover:border-white hover:text-white"
                >
                  {link.icon}
                </a>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              <p className="max-w-[23rem] text-[1.04rem] font-light leading-[1.55] text-white/84 sm:text-[1.1rem]">
                Support, partnerships, and curated prompt drops for creators building sharper Gemini
                workflows.
              </p>

              <FooterLinkItem
                href={`mailto:${EMAIL_ADDRESS}`}
                label={EMAIL_ADDRESS}
                className="footer-link-underline inline-flex text-[1.05rem] font-light text-white/82 transition-colors hover:text-white"
              />

              <div className="space-y-2 text-[0.98rem] font-light leading-[1.65] text-white/56">
                <p>Instagram for curated releases and fresh prompt drops.</p>
                <p>WhatsApp for community notes, support, and prompt feedback.</p>
              </div>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className="min-w-0">
              <h2 className="text-[1.05rem] capitalize text-white/88">{section.title}</h2>
              <div className="mt-5 flex flex-col gap-3.5">
                {section.links.map((link) => (
                  <FooterLinkItem
                    key={`${section.title}-${link.href}-${link.label}`}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                    className="footer-link-underline w-fit text-[1.02rem] leading-[1.45] text-white/72 transition-colors hover:text-white"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-px flex-1 bg-white/18" />
          <Link
            href="/prompts"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 py-3 text-[0.98rem] font-medium text-[#131313] transition hover:bg-[#d5ea52] self-start sm:self-auto"
          >
            Browse Prompts
          </Link>
        </div>

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-[29rem] text-[1rem] leading-[1.7] text-white/60">
            From prompt systems to reusable templates, Gemini Prompts helps creators move from idea
            to output faster.
          </p>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-[1rem] uppercase tracking-[0.04em] text-white/80">
            {legalLinks.map((link) => (
              <FooterLinkItem
                key={link.label}
                href={link.href}
                label={link.label}
                className="footer-link-underline text-white/80 transition-colors hover:text-white"
              />
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="group select-none">
            <div className="relative max-w-max overflow-hidden">
              <p className="translate-x-[-0.04em] text-[clamp(1.8rem,13vw,11rem)] font-medium uppercase leading-[0.9] tracking-[-0.08em] text-transparent bg-clip-text bg-[linear-gradient(110deg,rgba(255,255,255,0.18)_35%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0.18)_65%)] bg-[length:300%_100%] bg-[0%_0%] transition-[background-position] duration-1000 ease-in-out group-hover:bg-[100%_0%] sm:leading-[0.84]">
                GEMINI PROMPTS
              </p>
            </div>
            <div className="mt-1 h-[4px] w-[min(100%,68rem)] bg-[#d5ea52]" />
          </div>

          <div className="mt-4 flex flex-col gap-2 text-[0.93rem] text-white/38 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {currentYear} Gemini Prompts</p>
            <p>Built for prompt libraries, creative teams, and faster AI workflows.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
