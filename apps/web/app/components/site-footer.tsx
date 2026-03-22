import Image from 'next/image';
import Link from 'next/link';
import brandLogo from '../../Assets/Branding/logo.svg';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { href: '/prompt', label: 'All Prompts' },
      { href: '/membership', label: 'Membership' },
      { href: '/exclusive', label: 'Exclusive' },
      { href: '/newsletter', label: 'Newsletter' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { href: '/trending', label: 'Trending' },
      { href: '/category', label: 'Categories' },
      { href: '/popular-tags', label: 'Popular Tags' },
      { href: '/author', label: 'Authors' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
      { href: '/help', label: 'Help Center' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/disclaimer', label: 'Disclaimer' },
      { href: '/code-of-conduct', label: 'Code of Conduct' },
    ],
  },
];

const socialLinks: Array<
  FooterLink & {
    icon: React.ReactNode;
  }
> = [
  {
    href: 'https://x.com',
    label: 'X',
    external: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M6 4h3.4l3.3 4.6L16.7 4H20l-5.6 6.3L21 20h-3.4l-3.7-5.1L9.2 20H6l6.1-7-6.1-9Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    href: 'https://instagram.com',
    label: 'Instagram',
    external: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="17.1" cy="6.9" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: 'https://linkedin.com',
    label: 'LinkedIn',
    external: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M6.7 8.3a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm-1.3 2.1H8v8.6H5.4v-8.6Zm4.5 0h2.5v1.2h.1c.4-.8 1.4-1.5 3-1.5 3.2 0 3.8 2.1 3.8 4.8v4.1h-2.7v-3.6c0-.9 0-2.1-1.3-2.1s-1.6 1-1.6 2v3.7H9.9v-8.6Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    href: 'https://youtube.com',
    label: 'YouTube',
    external: true,
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
        <path
          d="M20 8.6a2.6 2.6 0 0 0-1.8-1.8C16.7 6.4 12 6.4 12 6.4s-4.7 0-6.2.4A2.6 2.6 0 0 0 4 8.6c-.4 1.5-.4 3.4-.4 3.4s0 1.9.4 3.4a2.6 2.6 0 0 0 1.8 1.8c1.5.4 6.2.4 6.2.4s4.7 0 6.2-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.5.4-3.4.4-3.4s0-1.9-.4-3.4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="m10.3 14.9 4-2.9-4-2.9v5.8Z" fill="currentColor" />
      </svg>
    ),
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
    <footer className="bg-[#0d1016] text-white">
      <div className="mx-auto w-full max-w-[1380px] px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="px-2 sm:px-0">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-[1.2fr_repeat(4,minmax(0,0.72fr))] lg:gap-10">
            <div className="col-span-2 max-w-[21rem] lg:col-span-1">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src={brandLogo}
                  alt="Gemini Prompts"
                  width={248}
                  height={44}
                  className="h-auto w-[210px] object-contain brightness-0 invert"
                />
              </Link>

              <p className="mt-5 text-[1.02rem] leading-[1.75] text-white/70">
                High-signal prompts, practical workflows, and premium collections for teams and
                creators building with AI every day.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#d5ea52] text-[#0f1116] transition hover:bg-white hover:text-[#0f1116]"
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            {footerSections.map((section) => (
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
        </div>
      </div>

      <div className="bg-[#161b24]">
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-3 px-4 py-4 text-[0.94rem] text-white/58 sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>&copy; {currentYear} Copyright by Gemini Prompts</p>
          <p className="inline-flex items-center gap-2">
            <span className="text-[#d5ea52]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 20.2 4.8 13a4.9 4.9 0 0 1 6.9-6.9L12 6.4l.3-.3a4.9 4.9 0 0 1 6.9 6.9L12 20.2Z" />
              </svg>
            </span>
            <span>
              Made with love by{' '}
            </span>
            <a
              href="https://argro.io"
              target="_blank"
              rel="noreferrer"
              className="footer-link-underline text-white/76 transition-colors hover:text-white"
            >
              Argro Team
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
