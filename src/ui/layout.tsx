import type { Child } from "hono/jsx";
import { html } from "hono/html";
import type { Locale } from "../lib/i18n/translations";
import { isRtl } from "../lib/i18n/context";
import { ScrollToTop } from "./scroll-to-top";

export const Layout = ({
  children,
  title,
  locale = "en",
}: {
  children: Child;
  title?: string;
  locale?: Locale;
}) => {
  const dir = isRtl(locale) ? "rtl" : "ltr";
  const fontClass = isRtl(locale) ? "font-['Vazirmatn',sans-serif]" : "font-sans";

  return (
    <html lang={locale} dir={dir} data-theme="dark" class={`scroll-smooth ${fontClass}`}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title ?? "CobraDecision"}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link href="/app.css" rel="stylesheet" />
        <link href="/fonts/vazirmatn.css" rel="stylesheet" />
        <script src="/htmx.js" />
        <script async defer src="/altcha.js" type="module" />
        <script defer src="/alpine.js" />
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

export const Document = ({
  children,
  title,
  locale = "en",
}: {
  children: Child;
  title?: string;
  locale?: Locale;
}) => html`<!DOCTYPE html>${<Layout title={title} locale={locale}>{children}</Layout>}`;
