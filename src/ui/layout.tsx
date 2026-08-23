import type { Child } from "hono/jsx";
import { html } from "hono/html";
import type { Locale } from "../lib/i18n/translations";
import { isRtl } from "../lib/i18n/context";
import { ScrollToTop } from "./scroll-to-top";

export interface DocumentProps {
  children: Child;
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  noindex?: boolean;
  locale?: Locale;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const Layout = ({
  children,
  title = "CobraDecision",
  description = "Connect, host, and collaborate on tech sessions, community meets, and interactive developer workshops.",
  canonicalUrl,
  ogImage = "/favicon.svg",
  ogType = "website",
  noindex = false,
  locale = "en",
  jsonLd,
}: DocumentProps) => {
  const dir = isRtl(locale) ? "rtl" : "ltr";
  const fontClass = isRtl(locale) ? "font-vazir" : "font-sans";
  const defaultTitle = title === "CobraDecision" ? title : `${title} | CobraDecision`;

  return (
    <html lang={locale} dir={dir} data-theme="dark" class={`scroll-smooth ${fontClass}`}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{defaultTitle}</title>
        <meta name="description" content={description} />
        {noindex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow" />
        )}

        {canonicalUrl && (
          <>
            <link rel="canonical" href={canonicalUrl} />
            <link rel="alternate" hreflang="en" href={`${new URL("/", canonicalUrl).origin}/locale/en`} />
            <link rel="alternate" hreflang="fa" href={`${new URL("/", canonicalUrl).origin}/locale/fa`} />
            <link rel="alternate" hreflang="x-default" href={`${new URL("/", canonicalUrl).origin}/`} />
          </>
        )}

        {/* OpenGraph */}
        <meta property="og:site_name" content="CobraDecision" />
        <meta property="og:title" content={defaultTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={ogType} />
        <meta property="og:locale" content={locale === "fa" ? "fa_IR" : "en_US"} />
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <meta property="og:image" content={ogImage} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={defaultTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />

        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}

        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#121d29" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CobraDecision" />
        <link rel="apple-touch-icon" href="/favicon.svg" />

        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preload" href="/fonts/webfonts/Vazirmatn[wght].woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link href="/app.css" rel="stylesheet" />
        <link href="/vazirmatn.css" rel="stylesheet" />
        <script src="/htmx.js" />
        <script async defer src="/altcha.js" type="module" />
        <script defer src="/alpine.js" />
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js');});}" }} />
        <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('htmx:beforeSwap',(event)=>{const status=event.detail.xhr.status;if(status>=400&&status<500){event.detail.shouldSwap=true;event.detail.isError=false}});document.addEventListener('htmx:afterSettle',()=>document.querySelectorAll('#toast-container > div').forEach((el)=>{if(!el.dataset.toastTimer){el.dataset.toastTimer='true';setTimeout(()=>{el.classList.add('opacity-0','transition-opacity','duration-300');setTimeout(()=>el.remove(),300)},5000);}}))" }} />
      </head>
      <body class="min-h-screen bg-base-200 text-base-content antialiased">
        <div id="toast-container" class="toast toast-top toast-end z-50"></div>
        {children}
        <ScrollToTop locale={locale} />
      </body>
    </html>
  );
};

export const Document = (props: DocumentProps) =>
  html`<!DOCTYPE html>${<Layout {...props} />}`;
