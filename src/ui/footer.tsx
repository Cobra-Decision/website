import { t } from "../lib/i18n/context";
import type { Locale } from "../lib/i18n/translations";
import { SOCIAL_MEDIA_LIST } from "../lib/social";

export const Footer = ({ locale = "en" }: { locale?: Locale }) => {
  return (
    <footer id="contact" class="bg-neutral text-neutral-content">
      <div class="mx-auto grid max-w-7xl gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto_1.2fr]">
        <div>
          <a class="inline-flex items-center gap-3 text-2xl font-bold" href="/">
            <img src="/favicon.svg" alt="CobraDecision" width="36" height="36" class="h-9 w-9" />
            <span>{t("brand.name", locale)}<span class="text-primary">.</span></span>
          </a>
          <p class="mt-4 max-w-xs leading-7 text-neutral-content/65">
            {t("footer.about", locale)}
          </p>
          <div class="mt-5">
            <a
              href="https://donate.sudoshz.ir/u/cobra-decision"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-error text-white btn-sm sm:btn-md shadow-sm"
            >
              {t("footer.support_yavar", locale)}
            </a>
          </div>
        </div>
        <div>
          <p class="font-semibold">{t("footer.find_us", locale)}</p>
          <div class="mt-4 grid gap-2 text-sm text-neutral-content/65">
            {SOCIAL_MEDIA_LIST.map((item) => (
              <a
                key={item.name}
                class="link-hover inline-flex items-center gap-2 transition-colors hover:text-primary"
                href={item.href}
                target={"target" in item ? item.target : undefined}
                rel={"rel" in item ? item.rel : undefined}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
        <form class="w-full max-w-md" hx-post="/api/contact" hx-target="#contact-result" hx-swap="outerHTML">
          <p class="font-semibold">{t("footer.contact_title", locale)}</p>
          <p class="mt-2 text-sm text-neutral-content/65">{t("footer.contact_subtitle", locale)}</p>
          <div class="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              class="input input-bordered w-full text-base-content"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              aria-label={t("footer.contact_title", locale)}
            />
            <button class="btn btn-primary sm:w-28">{t("footer.send", locale)}</button>
          </div>
          <div id="contact-result" class="mt-3"></div>
        </form>
      </div>
      <div class="border-t border-neutral-content/15 px-5 py-4 text-center text-xs text-neutral-content/50">
        {t("footer.copyright", locale)}
      </div>
    </footer>
  );
};
