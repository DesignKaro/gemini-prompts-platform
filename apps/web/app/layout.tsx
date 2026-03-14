import type { Metadata } from 'next';
import Link from 'next/link';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gemini Prompts',
  description: 'AI prompt sharing and membership platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path
            d="M4 10.7 12 4l8 6.7V20a1 1 0 0 1-1 1h-4.8v-5.2H9.8V21H5a1 1 0 0 1-1-1v-9.3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: '/latest',
      label: 'Services',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path
            d="m12 3.8 7.6 4.4v7.6L12 20.2l-7.6-4.4V8.2L12 3.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="m7.8 10.2 4.2 2.4 4.2-2.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ),
    },
    {
      href: '/membership',
      label: 'Pricing',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <rect
            x="3.4"
            y="6.4"
            width="17.2"
            height="11.2"
            rx="2.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M3.5 10.8h17" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ),
    },
    {
      href: '/trending',
      label: 'Features',
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <rect
            x="5"
            y="3.5"
            width="14"
            height="17"
            rx="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M8.2 11.2h7.6M9.5 14.4h5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ),
    },
  ];

  return (
    <html lang="en">
      <body className={poppins.className}>
        <header className="bg-[#c3c4cc] px-4 pb-2 pt-5 md:px-6">
          <div className="mx-auto max-w-[1380px] rounded-[38px] border border-white/80 bg-[#f3f4f6] px-5 py-4 shadow-[0_2px_14px_rgba(15,23,42,0.06)] sm:px-7">
            <div className="flex items-center justify-between gap-3 lg:gap-6">
              <Link href="/" className="flex shrink-0 items-center gap-3 text-[#101418]">
                <svg aria-hidden="true" viewBox="0 0 36 30" className="h-[30px] w-[36px]">
                  <path d="M2 4h9.2l13 14.1V4H34v22h-9.4L11.8 11.8V26H2z" fill="currentColor" />
                </svg>
                <span className="text-[40px] leading-none tracking-[-0.015em] sm:text-[42px]">Banking</span>
              </Link>

              <nav className="hidden items-center gap-3 lg:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 rounded-full bg-[#e9edf1] px-4 py-2.5 text-[18px] leading-none text-[#15181d]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d8de] bg-white text-[#171b21]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Link
                  href="/membership"
                  className="rounded-full bg-[#d5ea52] px-5 py-2.5 text-[20px] leading-none text-[#101418] sm:px-8 sm:py-3"
                >
                  Open Account
                </Link>
                <button
                  type="button"
                  aria-label="Open action"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#091216] text-white"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M7 17 17 7M9.6 7H17v7.4"
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
        </header>
        {children}
        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[1380px] px-4 py-8 text-sm text-slate-600">
            Gemini Prompts Platform - scaffold phase
          </div>
        </footer>
      </body>
    </html>
  );
}
