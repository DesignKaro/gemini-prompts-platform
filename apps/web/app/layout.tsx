import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { Providers } from './components/providers';
import { ConditionalShell, ConditionalHeader } from './components/conditional-shell';
import { SiteFooter } from './components/site-footer';
import { WebVitalsReporter } from './components/web-vitals-reporter';
import { NewsletterSubscribeForm } from './components/newsletter-subscribe-form';
import { SeoSchemaScripts } from './components/seo-schema-script';
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
  getSeoSettingsFresh,
} from '../lib/seo';
import './globals.css';
const GTM_CONTAINER_ID = 'GTM-5HMG8JZG';
const GTM_INIT_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;
const PRIVATE_SITE_ROUTE_PREFIXES = ['/dashboard', '/profile', '/login', '/membership/manage'];

function shouldInjectPublicSiteCode(pathname: string) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return !PRIVATE_SITE_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

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

async function GlobalIntegrationHeadAssets() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(SCHEMA_REQUEST_PATHNAME_HEADER) || '/';
  if (!shouldInjectPublicSiteCode(pathname)) return null;
  const settings = await getSeoSettingsFresh();
  const bundle = buildSeoIntegrationScriptBundle(settings.integrations);

  return (
    <>
      {bundle.customHeadInlineStyle ? (
        <style
          id="gp-custom-head-inline-style"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.customHeadInlineStyle }}
        />
      ) : null}
      {bundle.customHeadScriptUrls.map((src, index) => (
        <script key={`gp-custom-head-src-${src}-${index}`} src={src} />
      ))}
      {bundle.customHeadInlineScript ? (
        <script
          id="gp-custom-head-inline"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.customHeadInlineScript }}
        />
      ) : null}
      {bundle.gtagLoaderSrc ? (
        <Script id="gp-gtag-loader" src={bundle.gtagLoaderSrc} strategy="lazyOnload" />
      ) : null}
      {bundle.gtagInitScript ? (
        <Script
          id="gp-gtag-init"
          strategy="lazyOnload"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.gtagInitScript }}
        />
      ) : null}
      {bundle.adsenseLoaderSrc ? (
        <script async src={bundle.adsenseLoaderSrc} crossOrigin="anonymous" />
      ) : null}
      {bundle.clarityInitScript ? (
        <Script
          id="gp-clarity-init"
          strategy="lazyOnload"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.clarityInitScript }}
        />
      ) : null}
    </>
  );
}

async function GlobalIntegrationBodyStartScript() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(SCHEMA_REQUEST_PATHNAME_HEADER) || '/';
  if (!shouldInjectPublicSiteCode(pathname)) return null;
  const settings = await getSeoSettingsFresh();
  const bundle = buildSeoIntegrationScriptBundle(settings.integrations);

  return (
    <>
      {bundle.customBodyStartInlineScript ? (
        <script
          id="gp-custom-body-start-inline"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: bundle.customBodyStartInlineScript }}
        />
      ) : null}
    </>
  );
}

async function GlobalIntegrationBodyEndScript() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(SCHEMA_REQUEST_PATHNAME_HEADER) || '/';
  if (!shouldInjectPublicSiteCode(pathname)) return null;
  const settings = await getSeoSettingsFresh();
  const bundle = buildSeoIntegrationScriptBundle(settings.integrations);
  if (!bundle.customBodyEndInlineScript) return null;

  return (
    <script
      id="gp-custom-body-end-inline"
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        />
        <Script
          id="gp-gtm-init"
          strategy="beforeInteractive"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: GTM_INIT_SCRIPT }}
        />
        <GlobalIntegrationHeadAssets />
      </head>
      <body suppressHydrationWarning>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <GlobalSchemaScripts />
        <GlobalIntegrationBodyStartScript />
        <Providers>
          <WebVitalsReporter />
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
