import type { Metadata, Viewport } from 'next';
import { Providers } from './components/providers';
import { ConditionalShell, ConditionalHeader } from './components/conditional-shell';
import { SiteFooter } from './components/site-footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gemini Prompts',
  description: 'AI prompt sharing and membership platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <div id="top" />
          <ConditionalHeader />
          {children}
          <ConditionalShell
            newsletterCta={
              <section key="newsletterCta" className="relative overflow-hidden bg-[#d5ea52]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-[220px] -top-[240px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_65%)] blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-[300px] -left-[240px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.07)_0%,rgba(0,0,0,0)_65%)] blur-3xl"
                />

                <div className="page-container-wide px-4 py-12 sm:px-6 lg:py-16">
                  <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div>
                      <h2 className="section-heading-medium text-[1.95rem] leading-[1.05] tracking-[-0.05em] text-[#0f1116] sm:text-[2.25rem] lg:text-[2.65rem]">
                        Get the weekly prompt drop.
                      </h2>
                      <p className="mt-4 max-w-[34rem] text-[1.02rem] leading-[1.7] text-[#2a3010]">
                        High-signal prompts, new collections, and the best blog reads — delivered
                        once a week. No spam.
                      </p>
                    </div>

                    <div className="rounded-[26px] border border-black/10 bg-white p-5 shadow-none sm:p-6">
                      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="sr-only" htmlFor="newsletter-email">
                          Email address
                        </label>
                        <input
                          id="newsletter-email"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="you@company.com"
                          className="h-[52px] w-full rounded-full border border-[#d8dce2] bg-white px-5 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                        />
                        <button
                          type="submit"
                          className="h-[52px] w-full rounded-full bg-[#d5ea52] px-7 text-[1rem] font-[500] text-[#0f1116] transition-colors hover:bg-[#c8e030] sm:w-auto"
                        >
                          Subscribe
                        </button>
                      </form>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.9rem] text-[#6a7280]">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#111111]">
                              <path
                                d="M6 12.3l3.3 3.2L18.5 6.8"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          Unsubscribe anytime
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#111111]">
                              <path
                                d="M7.5 10.8V9.4a4.5 4.5 0 0 1 9 0v1.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                              />
                              <rect
                                x="6.2"
                                y="10.8"
                                width="11.6"
                                height="9.6"
                                rx="2.2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                              />
                            </svg>
                          </span>
                          We keep your email private
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            }
            footer={
              <SiteFooter key="footer" />
            }
          />
        </Providers>
      </body>
    </html>
  );
}
