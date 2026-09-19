import type { LandingCache } from "../../lib/cache";
import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";
import { PublicHeader } from "../../ui/public-header";
import { UnifiedMeetCard } from "../../ui/meet-card";
import { Carousel } from "../../ui/carousel";
import { StatsBar } from "../../ui/stats-bar";
import { Footer } from "../../ui/footer";

export const Landing = ({ data, locale = "en" }: { data: LandingCache; locale?: Locale }) => {
  const featured = data.meets[0];

  return (
    <div class="overflow-x-hidden bg-base-100 min-h-screen">
      <PublicHeader locale={locale} activePage="landing" />

      <main>
        {/* Hero Section */}
        <section class="border-b border-base-200 bg-gradient-to-br from-base-100 via-base-100 to-primary/10">
          <div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
            <div class="max-w-2xl">
              <div class="inline-flex items-center justify-center mb-6 max-w-full">
                <span class="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary text-center leading-normal">
                  {t("hero.badge", locale)}
                </span>
              </div>
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
            <StatsBar
              totalUsers={data.totalUsers}
              totalMeetHours={data.totalMeetHours}
              totalMeets={data.totalMeets}
              locale={locale}
            />
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

      <Footer locale={locale} />
    </div>
  );
};
