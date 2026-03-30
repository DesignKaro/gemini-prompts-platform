import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';
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
      { href: '/refund-and-return-policy', label: 'Refund & Return Policy' },
    ],
  },
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
                Simple prompts for better AI images, cleaner edits, and faster creative results
                for everyday creators and small teams.
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
            <span>Made with love by </span>
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
