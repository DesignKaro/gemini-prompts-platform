import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';
import { BRAND_LOGO_URL } from '../../lib/site-assets';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const footerColumns: FooterSection[][] = [
  [
    {
      title: 'Product',
      links: [
        { href: '/prompts', label: 'All Prompts' },
        { href: '/membership', label: 'Membership' },
        { href: '/exclusive', label: 'Exclusive' },
        { href: '/newsletter', label: 'Newsletter' },
      ],
    },
    {
      title: 'Explore',
      links: [
        { href: '/trending', label: 'Trending' },
        { href: '/latest', label: 'Latest' },
        { href: '/most-popular', label: 'Most Popular' },
        { href: '/category', label: 'Categories' },
      ],
    },
  ],
  [
    {
      title: 'Company',
      links: [
        { href: '/about', label: 'About Gemini Prompts' },
        { href: '/contact', label: 'Contact' },
        { href: '/help', label: 'Help Center' },
        { href: '/search', label: 'Search' },
      ],
    },
    {
      title: 'Discover',
      links: [
        { href: '/blog', label: 'Blog' },
        { href: '/author', label: 'Authors' },
        { href: '/popular-tags', label: 'Popular Tags' },
        { href: '/tag', label: 'Tag Directory' },
      ],
    },
  ],
  [
    {
      title: 'Support',
      links: [
        { href: '/help', label: 'Support Docs' },
        { href: '/contact', label: 'Contact Support' },
        { href: '/membership', label: 'Membership Help' },
        { href: '/search', label: 'Find Anything' },
      ],
    },
    {
      title: 'Account',
      links: [
        { href: '/profile', label: 'My Profile' },
        { href: '/membership', label: 'Plans & Access' },
        { href: '/exclusive', label: 'Exclusive Library' },
        { href: '/newsletter', label: 'Prompt Drops' },
      ],
    },
  ],
];

const legalLinks: FooterLink[] = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-and-return-policy', label: 'Refund & Return Policy' },
];

const socialLinks: Array<
  FooterLink & {
    icon: React.ReactNode;
  }
> = [
  {
    href: 'https://www.instagram.com/geminiprompts.io?igsh=MW5qOTZwdHJlMHhvYQ==',
    label: 'Instagram',
    external: true,
    icon: <FaInstagram aria-hidden="true" className="h-[19px] w-[19px]" />,
  },
  {
    href: 'https://chat.whatsapp.com/El7eMYNAAF5EOhWKvDCl6n?mode=gi_t',
    label: 'WhatsApp',
    external: true,
    icon: <FaWhatsapp aria-hidden="true" className="h-[19px] w-[19px]" />,
  },
];

function FooterLinkItem({ href, label, external }: FooterLink) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="footer-link-underline text-[0.98rem] text-white/68 transition-colors hover:text-white"
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="footer-link-underline text-[0.98rem] text-white/68 transition-colors hover:text-white"
    >
      {label}
    </Link>
  );
}

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto w-full max-w-[1380px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="px-2 sm:px-0">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_repeat(3,minmax(0,0.8fr))] lg:gap-10">
            <div className="max-w-[21rem]">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src={BRAND_LOGO_URL}
                  alt="Gemini Prompts"
                  width={248}
                  height={44}
                  className="h-auto w-[210px] object-contain brightness-0 invert"
                  unoptimized
                />
              </Link>

              <p className="mt-5 text-[1.02rem] leading-[1.75] text-white/70">
                Simple prompts for better AI images, cleaner edits, and faster creative results for
                everyday creators and small teams.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-white/74 transition hover:bg-white/[0.14] hover:text-white"
                  >
                    {link.icon}
                  </a>
                ))}
              </div>

              <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/[0.08] px-4 py-3 text-[0.96rem] text-white/82">
                <span className="h-2.5 w-2.5 rounded-full bg-[#18d57b] shadow-[0_0_0_4px_rgba(24,213,123,0.16)]" />
                Fresh prompt drops every week
              </div>
            </div>

            {footerColumns.map((column, columnIndex) => (
              <div key={`footer-column-${columnIndex}`} className="space-y-10">
                {column.map((section) => (
                  <div key={section.title}>
                    <h2 className="text-[1.08rem] font-medium tracking-[-0.02em] text-white">
                      {section.title}
                    </h2>
                    <div className="mt-5 flex flex-col gap-3.5">
                      {section.links.map((link) => (
                        <FooterLinkItem
                          key={`${section.title}-${link.href}-${link.label}`}
                          href={link.href}
                          label={link.label}
                          external={link.external}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.96rem] text-white/58">
              &copy; {currentYear} Gemini Prompts. Curated prompt systems for modern teams.
            </p>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="footer-link-underline text-[0.96rem] text-white/62 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
