import type { LandingCache } from "../../lib/cache";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { SOCIAL_MEDIA_LIST } from "../../lib/social";
import { LanguageSwitch } from "../../ui/language-switch";
import { UnifiedMeetCard } from "../../ui/meet-card";
import { Carousel } from "../../ui/carousel";

export const Landing = ({ data, locale = "en" }: { data: LandingCache; locale?: Locale }) => {
  const featured = data.meets[0];
  const totalUsersFormatted = formatLocalizedNumber(data.totalUsers, locale);
  const totalHoursFormatted = formatLocalizedNumber(data.totalMeetHours, locale);
  const totalMeetsFormatted = formatLocalizedNumber(data.meets.length, locale);

  return (
    <div class="overflow-x-hidden bg-base-100 min-h-screen">
      {/* Sticky Header Navbar */}
      <header class="border-b border-base-200 bg-base-100/90 sticky top-0 z-30 backdrop-blur">
        <nav class="navbar mx-auto min-h-20 max-w-7xl px-5 sm:px-8">
          <div class="flex-1">
            <a class="inline-flex items-center gap-3 text-xl font-bold tracking-tight" href="/">
              <img src="/favicon.svg" alt="CobraDecision" width="32" height="32" class="h-8 w-8" />
              <span>{t("brand.name", locale)}<span class="text-primary">.</span></span>
            </a>
          </div>
          <div class="hidden gap-7 text-sm font-medium md:flex">
            <a class="link-hover" href="#how-it-works">{t("nav.how_it_works", locale)}</a>
            <a class="link-hover" href="#meets">{t("nav.meets", locale)}</a>
            <a class="link-hover" href="#contact">{t("nav.contact", locale)}</a>
          </div>
          <div class="flex-none gap-3 ps-4">
            <LanguageSwitch currentLocale={locale} size="xs" />
            <a class="btn btn-primary btn-sm px-5" href="/auth">{t("nav.sign_in", locale)}</a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section class="border-b border-base-200 bg-gradient-to-br from-base-100 via-base-100 to-primary/10">
          <div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
            <div class="max-w-2xl">
              <span class="badge badge-primary badge-outline mb-6 rounded-full px-4 py-3">
                {t("hero.badge", locale)}
              </span>
              <h1 class="text-5xl font-bold tracking-tight text-base-content sm:text-6xl lg:text-7xl leading-tight">
                {t("hero.title", locale)}
              </h1>
              <p class="mt-6 max-w-xl text-lg leading-8 text-base-content/70">
                {t("hero.subtitle", locale)}
              </p>
              <div class="mt-9 flex flex-wrap gap-3">
                <a class="btn btn-primary px-6 shadow-md" href="#meets">{t("hero.cta_explore", locale)}</a>
                <a class="btn btn-ghost px-4" href="#how-it-works">{t("hero.cta_how", locale)}</a>
              </div>
            </div>

            <div class="relative mx-auto w-full max-w-md">
              <div class="absolute -inset-5 rounded-[2rem] bg-primary/15 blur-2xl"></div>
              {featured ? (
                <UnifiedMeetCard meet={featured} locale={locale} variant="featured" />
              ) : (
                <div class="relative rounded-3xl border border-dashed border-base-300 bg-base-100 p-12 text-center shadow-xl">
                  <div class="text-4xl">✦</div>
                  <h2 class="mt-4 text-xl font-bold">{t("meets.empty", locale)}</h2>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Centered Stats Bar */}
        <section class="border-b border-base-200 bg-base-100 py-10">
          <div class="mx-auto max-w-7xl px-5 sm:px-8">
            <div class="flex flex-wrap items-center justify-center gap-8 text-center sm:gap-16">
              <div class="px-4">
                <p class="text-sm font-medium text-base-content/60">{t("stats.members", locale)}</p>
                <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalUsersFormatted}</p>
              </div>
              <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
              <div class="px-4">
                <p class="text-sm font-medium text-base-content/60">{t("stats.hours", locale)}</p>
                <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalHoursFormatted}</p>
              </div>
              <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
              <div class="px-4">
                <p class="text-sm font-medium text-base-content/60">{t("stats.meets", locale)}</p>
                <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalMeetsFormatted}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" class="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div class="max-w-xl">
            <p class="font-semibold text-primary">{t("how.title_badge", locale)}</p>
            <h2 class="mt-3 text-3xl font-bold sm:text-4xl">{t("how.heading", locale)}</h2>
          </div>
          <div class="mt-12 grid gap-5 md:grid-cols-3">
            <div class="rounded-2xl bg-base-200 p-7 space-y-3">
              <span class="text-3xl font-mono text-primary">01</span>
              <h3 class="text-xl font-bold">{t("how.step1_title", locale)}</h3>
              <p class="leading-7 text-base-content/60">{t("how.step1_desc", locale)}</p>
            </div>
            <div class="rounded-2xl bg-base-200 p-7 space-y-3">
              <span class="text-3xl font-mono text-primary">02</span>
              <h3 class="text-xl font-bold">{t("how.step2_title", locale)}</h3>
              <p class="leading-7 text-base-content/60">{t("how.step2_desc", locale)}</p>
            </div>
            <div class="rounded-2xl bg-base-200 p-7 space-y-3">
              <span class="text-3xl font-mono text-primary">03</span>
              <h3 class="text-xl font-bold">{t("how.step3_title", locale)}</h3>
              <p class="leading-7 text-base-content/60">{t("how.step3_desc", locale)}</p>
            </div>
          </div>
        </section>

        {/* Meets Carousel Section */}
        <section id="meets" class="bg-base-200 py-20">
          <div class="mx-auto max-w-7xl px-5 sm:px-8">
            <div class="flex items-end justify-between gap-6">
              <div>
                <p class="font-semibold text-primary">{t("meets.section_badge", locale)}</p>
                <h2 class="mt-3 text-3xl font-bold sm:text-4xl">{t("meets.section_title", locale)}</h2>
              </div>
              <p class="hidden max-w-xs text-end text-sm text-base-content/60 sm:block">
                {t("meets.section_subtitle", locale)}
              </p>
            </div>

            <div class="mt-10 w-full max-w-full">
              {data.meets.length ? (
                <Carousel id="landing-meets-carousel" locale={locale}>
                  {data.meets.map((meet) => (
                    <UnifiedMeetCard key={meet.id} meet={meet} locale={locale} variant="carousel" />
                  ))}
                </Carousel>
              ) : (
                <div class="rounded-2xl border border-dashed border-base-300 bg-base-100 p-10 text-center text-base-content/60">
                  {t("meets.empty", locale)}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" class="bg-neutral text-neutral-content">
        <div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto_1.2fr]">
          <div>
            <a class="inline-flex items-center gap-3 text-2xl font-bold" href="/">
              <img src="/favicon.svg" alt="CobraDecision" width="36" height="36" class="h-9 w-9" />
              <span>{t("brand.name", locale)}<span class="text-primary">.</span></span>
            </a>
            <p class="mt-4 max-w-xs leading-7 text-neutral-content/65">
              {t("footer.about", locale)}
            </p>
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
              <input class="input input-bordered w-full text-base-content" name="email" type="email" required placeholder="you@example.com" />
              <button class="btn btn-primary sm:w-28">{t("footer.send", locale)}</button>
            </div>
            <div id="contact-result" class="mt-3"></div>
          </form>
        </div>
        <div class="border-t border-neutral-content/15 px-5 py-5 text-center text-xs text-neutral-content/50">
          {t("footer.copyright", locale)}
        </div>
      </footer>
    </div>
  );
};
