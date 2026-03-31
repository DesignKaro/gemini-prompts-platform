import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import Script from 'next/script';
import { headers } from 'next/headers';
import { Providers } from './components/providers';
import { ConditionalShell, ConditionalHeader } from './components/conditional-shell';
import { SiteFooter } from './components/site-footer';
import { WebVitalsReporter } from './components/web-vitals-reporter';
import { NewsletterSubscribeForm } from './components/newsletter-subscribe-form';
import { SeoSchemaScripts } from './components/seo-schema-script';
import { ConsentModal } from './components/consent-modal';
import { buildSeoIntegrationScriptBundle } from '../lib/seo-integrations';
import {
  SCHEMA_REQUEST_PATHNAME_HEADER,
  SCHEMA_REQUEST_SEARCH_HEADER,
  shouldDisableSchemaForRoute,
} from '../lib/schema-route-visibility';
import {
  DEFAULT_SEO_SETTINGS,
  getBaseUrl,
  getDefaultOgImage,
  getSeoSettings,
} from '../lib/seo';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  const baseUrl = getBaseUrl(settings);
  const siteTitle = settings.siteTitle || DEFAULT_SEO_SETTINGS.siteTitle;
  const titleSeparator = settings.titleSeparator || DEFAULT_SEO_SETTINGS.titleSeparator;
  const description = settings.defaultMetaDescription || DEFAULT_SEO_SETTINGS.defaultMetaDescription;
  const defaultOgImage = settings.defaultOgImageUrl || getDefaultOgImage(baseUrl);
  const integrationBundle = buildSeoIntegrationScriptBundle(settings.integrations);
  const googleVerification =
    integrationBundle.googleSiteVerification || settings.googleSiteVerification || undefined;
  const msVerification =
    integrationBundle.bingSiteVerification || settings.bingSiteVerification || undefined;
  const metaOther: Record<string, string> = {};
  if (msVerification) {
    metaOther['msvalidate.01'] = msVerification;
  }
  if (integrationBundle.adsensePublisherId) {
    metaOther['google-adsense-account'] = integrationBundle.adsensePublisherId;
  }

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: siteTitle,
      template: `%s ${titleSeparator} ${siteTitle}`,
    },
    description,
    applicationName: siteTitle,
    appleWebApp: {
      capable: true,
      title: siteTitle,
      statusBarStyle: 'default',
    },
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      siteName: siteTitle,
      title: siteTitle,
      description,
      url: baseUrl,
      images: [
        {
          url: defaultOgImage,
          alt: settings.defaultOgImageAlt || siteTitle,
        },
      ],
    },
    twitter: {
      card: settings.twitterCardType,
      title: siteTitle,
      description,
      images: [defaultOgImage],
    },
    robots: {
      index: settings.robotsSiteIndex,
      follow: settings.robotsSiteFollow,
      googleBot: {
        index: settings.robotsSiteIndex,
        follow: settings.robotsSiteFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: '/icon.svg',
      shortcut: '/icon.svg',
      apple: '/icon.svg',
    },
    verification: {
      google: googleVerification,
      other: Object.keys(metaOther).length > 0 ? metaOther : undefined,
    },
    alternates: {
      canonical: '/',
    },
  };
}

async function GlobalIntegrationScripts() {
  const settings = await getSeoSettings();
  const bundle = buildSeoIntegrationScriptBundle(settings.integrations);
  const fallbackGaMeasurementId = 'G-K188R14HR6';
  const shouldInjectFallbackGa = !bundle.gtagLoaderSrc && !bundle.gtagInitScript;
  const fallbackClarityProjectId = 'w45opfylyv';
  const shouldInjectFallbackClarity = !bundle.clarityInitScript;
  const fallbackGaInitScript = [
    'window.dataLayer = window.dataLayer || [];',
    'function gtag(){dataLayer.push(arguments);}',
    "gtag('js', new Date());",
    `gtag('config', '${fallbackGaMeasurementId}');`,
  ].join('\n');
  const fallbackClarityInitScript = [
    '(function(c,l,a,r,i,t,y){',
    'c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};',
    't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;',
    'y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);',
    `})(window, document, 'clarity', 'script', '${fallbackClarityProjectId}');`,
  ].join('');

  return (
    <>
      {bundle.gtagLoaderSrc ? (
        <Script id="gp-gtag-loader" src={bundle.gtagLoaderSrc} strategy="afterInteractive" />
      ) : shouldInjectFallbackGa ? (
        <Script
          id="gp-gtag-loader-fallback"
          src={`https://www.googletagmanager.com/gtag/js?id=${fallbackGaMeasurementId}`}
          strategy="afterInteractive"
        />
      ) : null}
      {bundle.gtagInitScript ? (
        <Script
          id="gp-gtag-init"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.gtagInitScript }}
        />
      ) : shouldInjectFallbackGa ? (
        <Script
          id="gp-gtag-init-fallback"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: fallbackGaInitScript }}
        />
      ) : null}
      {bundle.adsenseLoaderSrc ? (
        <Script
          id="gp-adsense-loader"
          src={bundle.adsenseLoaderSrc}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      ) : null}
      {bundle.clarityInitScript ? (
        <Script
          id="gp-clarity-init"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.clarityInitScript }}
        />
      ) : shouldInjectFallbackClarity ? (
        <Script
          id="gp-clarity-init-fallback"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: fallbackClarityInitScript }}
        />
      ) : null}
      {bundle.customHeadScriptUrls.map((src, index) => (
        <Script
          key={`gp-custom-head-src-${src}-${index}`}
          id={`gp-custom-head-src-${index}`}
          src={src}
          strategy="afterInteractive"
        />
      ))}
      {bundle.customHeadInlineScript ? (
        <Script
          id="gp-custom-head-inline"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.customHeadInlineScript }}
        />
      ) : null}
      {bundle.customBodyStartInlineScript ? (
        <Script
          id="gp-custom-body-start-inline"
          strategy="afterInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.customBodyStartInlineScript }}
        />
      ) : null}
    </>
  );
}

async function GlobalIntegrationBodyEndScript() {
  const settings = await getSeoSettings();
  const bundle = buildSeoIntegrationScriptBundle(settings.integrations);
  if (!bundle.customBodyEndInlineScript) return null;

  return (
    <Script
      id="gp-custom-body-end-inline"
      strategy="afterInteractive"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: bundle.customBodyEndInlineScript }}
    />
  );
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

async function GlobalSchemaScripts() {
  const settings = await getSeoSettings();
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(SCHEMA_REQUEST_PATHNAME_HEADER) || '/';
  const search = requestHeaders.get(SCHEMA_REQUEST_SEARCH_HEADER) || '';

  if (
    shouldDisableSchemaForRoute({
      pathname,
      search,
      settings,
    })
  ) {
    return null;
  }

  const baseUrl = getBaseUrl(settings);
  const organizationName = settings.organizationName || settings.siteTitle;
  const schemaItems = [
    {
      family: 'website' as const,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${baseUrl}#website`,
        name: settings.siteTitle,
        url: baseUrl,
      },
    },
    {
      family: 'organization' as const,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${baseUrl}#organization`,
        name: organizationName,
        url: baseUrl,
        logo: settings.organizationLogoUrl || undefined,
        sameAs: settings.organizationSameAs.length > 0 ? settings.organizationSameAs : undefined,
      },
    },
  ];

  return <SeoSchemaScripts items={schemaItems} />;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.variable} suppressHydrationWarning>
        <GlobalSchemaScripts />
        <GlobalIntegrationScripts />
        <Providers>
          <WebVitalsReporter />
          <ConsentModal />
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
                      <NewsletterSubscribeForm
                        source="global_cta"
                        inputId="newsletter-email"
                        fieldGroupClassName="flex flex-col gap-3 sm:flex-row sm:items-center"
                        inputClassName="h-[52px] w-full rounded-full border border-[#d8dce2] bg-white px-5 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                        buttonClassName="h-[52px] w-full rounded-full bg-[#d5ea52] px-7 text-[1rem] font-[500] text-[#0f1116] transition-colors hover:bg-[#c8e030] sm:w-auto"
                        successClassName="mt-3 text-[0.88rem] text-[#1f4f1f]"
                        errorClassName="mt-3 text-[0.88rem] text-[#9d1c1c]"
                      />

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.9rem] text-[#6a7280]">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4 text-[#111111]"
                            >
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
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-4 w-4 text-[#111111]"
                            >
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
            footer={<SiteFooter key="footer" />}
          />
        </Providers>
        <GlobalIntegrationBodyEndScript />
      </body>
    </html>
  );
}
