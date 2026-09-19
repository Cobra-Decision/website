import type { LandingCache } from "../../lib/cache";
import type { Locale } from "../../lib/i18n/translations";
import { t, formatLocalizedNumber } from "../../lib/i18n/context";
import { SOCIAL_MEDIA_LIST } from "../../lib/social";
import { LanguageSwitch } from "../../ui/language-switch";

export const AboutView = ({ data, locale = "en" }: { data: LandingCache; locale?: Locale }) => {
  const totalUsersFormatted = formatLocalizedNumber(data.totalUsers, locale);
  const totalHoursFormatted = formatLocalizedNumber(data.totalMeetHours, locale);
  const totalMeetsFormatted = formatLocalizedNumber(data.totalMeets, locale);

  const tracks = [
    { title: t("about.tracks.backend", locale), desc: locale === "fa" ? "طراحی سیستم، پایگاه‌های داده توزیع‌شده، میکروسرویس‌ها و پرفورمنس" : "Distributed systems, database design, microservices, and performance." },
    { title: t("about.tracks.ai", locale), desc: locale === "fa" ? "مدل‌های زبانی بزرگ، یادگیری ماشین در پروداکشن و زیرساخت داده" : "LLMs, production machine learning, vector search, and data pipelines." },
    { title: t("about.tracks.devops", locale), desc: locale === "fa" ? "زیرساخت لینوکسی، کانتینرها، CI/CD، پایش و امنیت شبکه" : "Linux servers, containers, CI/CD, observability, and network security." },
    { title: t("about.tracks.craftsmanship", locale), desc: locale === "fa" ? "معماری تمیز، تست‌نویسی خودکار، ریفکتور و طراحی ماژولار" : "Clean architecture, automated testing, refactoring, and modular design." },
    { title: t("about.tracks.softskills", locale), desc: locale === "fa" ? "رهبری فنی، منتورینگ، فرهنگ مهندسی و چالش‌های رشد شغلی" : "Technical leadership, mentoring, engineering culture, and career growth." },
  ];

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
            <a class="link-hover" href="/#how-it-works">{t("nav.how_it_works", locale)}</a>
            <a class="link-hover" href="/#meets">{t("nav.meets", locale)}</a>
            <a class="text-primary font-bold" href="/about">{t("nav.about", locale)}</a>
            <a class="link-hover" href="/support">{t("nav.support", locale)}</a>
            <a class="link-hover" href="/#contact">{t("nav.contact", locale)}</a>
          </div>
          <div class="flex-none gap-3 ps-4">
            <LanguageSwitch currentLocale={locale} size="xs" />
            <a class="btn btn-primary btn-sm px-5" href="/auth">{t("nav.sign_in", locale)}</a>
          </div>
        </nav>
      </header>

      <main class="space-y-24 py-12 sm:py-20">
        {/* Hero & Manifesto */}
        <section class="mx-auto max-w-5xl px-5 sm:px-8 text-center">
          <span class="badge badge-primary badge-outline mb-6 rounded-full px-5 py-3 text-xs sm:text-sm font-medium">
            {t("about.hero_quote", locale)}
          </span>
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            {t("about.hero_title", locale)}
          </h1>
          <p class="mt-6 mx-auto max-w-3xl text-lg sm:text-xl leading-relaxed text-base-content/75">
            {t("about.hero_subtitle", locale)}
          </p>
          <div class="mt-10 flex flex-wrap justify-center gap-4">
            <a class="btn btn-primary px-8 shadow-md" href="/#meets">
              {t("hero.cta_explore", locale)}
            </a>
            <a class="btn btn-outline px-8" href="/support">
              {t("about.cta_support", locale)}
            </a>
          </div>
        </section>

        {/* Mission & Vision */}
        <section class="mx-auto max-w-7xl px-5 sm:px-8">
          <div class="grid gap-8 md:grid-cols-2">
            <div class="card border border-base-300 bg-base-200/50 p-8 shadow-sm">
              <div class="badge badge-primary badge-sm mb-4 font-bold">{t("about.mission_title", locale)}</div>
              <h2 class="text-2xl font-bold text-base-content">
                {locale === "fa" ? "گفتگوی عمیق بدون هیاهو" : "Focused Conversations Without Noise"}
              </h2>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.mission_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-200/50 p-8 shadow-sm">
              <div class="badge badge-secondary badge-sm mb-4 font-bold">{t("about.vision_title", locale)}</div>
              <h2 class="text-2xl font-bold text-base-content">
                {locale === "fa" ? "مرجع همتا-به-همتای توسعه‌دهندگان" : "Peer-to-Peer Engineering Reference"}
              </h2>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.vision_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section class="mx-auto max-w-7xl px-5 sm:px-8">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">{t("about.values_title", locale)}</h2>
            <p class="mt-3 text-base-content/65">
              {locale === "fa" ? "اصولی که جلسات، تعاملات و فرهنگ تصمیم کبرا را شکل می‌دهند." : "The core pillars guiding our meetings, discussions, and community culture."}
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-3">
            <div class="card border border-base-300 bg-base-100 p-6 shadow-sm">
              <div class="text-3xl mb-4">💡</div>
              <h3 class="text-xl font-bold">{t("about.values.learn_in_public", locale)}</h3>
              <p class="mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.learn_in_public_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-100 p-6 shadow-sm">
              <div class="text-3xl mb-4">🔬</div>
              <h3 class="text-xl font-bold">{t("about.values.depth_over_hype", locale)}</h3>
              <p class="mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.depth_over_hype_desc", locale)}
              </p>
            </div>
            <div class="card border border-base-300 bg-base-100 p-6 shadow-sm">
              <div class="text-3xl mb-4">🤝</div>
              <h3 class="text-xl font-bold">{t("about.values.constructive_dialogue", locale)}</h3>
              <p class="mt-3 text-sm text-base-content/70 leading-relaxed">
                {t("about.values.constructive_dialogue_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Weekly Formats */}
        <section class="mx-auto max-w-7xl px-5 sm:px-8 bg-base-200/40 py-16 rounded-3xl border border-base-300">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">{t("about.formats_title", locale)}</h2>
            <p class="mt-3 text-base-content/65">
              {locale === "fa" ? "جلسات آنلاین هفتگی ما در دو فرمت مکمل و مشخص برگزار می‌شوند." : "Weekly online gatherings hosted in two complementary formats."}
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <div class="card bg-base-100 border border-base-300 p-8 shadow-sm">
              <span class="badge badge-primary badge-sm font-semibold mb-3">Weekly • جمعه‌ها</span>
              <h3 class="text-2xl font-bold">{t("about.formats.roundtables", locale)}</h3>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.formats.roundtables_desc", locale)}
              </p>
            </div>
            <div class="card bg-base-100 border border-base-300 p-8 shadow-sm">
              <span class="badge badge-secondary badge-sm font-semibold mb-3">Deep-Dive • ارائه‌های فنی</span>
              <h3 class="text-2xl font-bold">{t("about.formats.talks", locale)}</h3>
              <p class="mt-4 text-base-content/75 leading-relaxed">
                {t("about.formats.talks_desc", locale)}
              </p>
            </div>
          </div>
        </section>

        {/* Tracks & Domains */}
        <section class="mx-auto max-w-7xl px-5 sm:px-8">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">{t("about.tracks_title", locale)}</h2>
            <p class="mt-3 text-base-content/65">
              {locale === "fa" ? "سرفصل‌ها و موضوعات محوری که در جلسات به بحث گذاشته می‌شوند." : "Core tracks and specialized domains explored in our community sessions."}
            </p>
          </div>
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => (
              <div key={track.title} class="card border border-base-300 bg-base-100 p-6 shadow-sm">
                <h3 class="font-bold text-lg text-primary">{track.title}</h3>
                <p class="mt-2 text-sm text-base-content/70 leading-relaxed">{track.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Metrics */}
        <section class="border-y border-base-200 bg-base-100 py-12">
          <div class="mx-auto max-w-7xl px-5 sm:px-8 text-center">
            <h2 class="text-2xl font-bold mb-8">{t("about.metrics_title", locale)}</h2>
            <div class="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
              {data.totalUsers >= 50 && (
                <>
                  <div class="px-4">
                    <p class="text-sm font-medium text-base-content/60">{t("stats.members", locale)}</p>
                    <p class="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{totalUsersFormatted}</p>
                  </div>
                  <div class="h-10 w-px bg-base-300 hidden sm:block"></div>
                </>
              )}
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

        {/* Community Action Hub */}
        <section class="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <div class="rounded-3xl border border-base-300 bg-gradient-to-b from-base-200/60 to-base-100 p-10 shadow-sm">
            <h2 class="text-3xl font-bold">
              {locale === "fa" ? "هم‌اکنون به گفتگو بپیوندید" : "Join the Conversation Today"}
            </h2>
            <p class="mt-4 text-base-content/70 max-w-xl mx-auto">
              {locale === "fa" ? "در جلسات بعدی شرکت کنید، ارائه‌ای به اشتراک بگذارید، یا به گفتگوهای آزاد بپیوندید." : "Attend upcoming meets, propose your technical talk, or take part in our weekly roundtables."}
            </p>
            <div class="mt-8 flex flex-wrap justify-center gap-4">
              <a class="btn btn-primary px-6" href="https://t.me/CobraDecisionBot" target="_blank" rel="noopener noreferrer">
                {t("about.cta_join_bot", locale)}
              </a>
              <a class="btn btn-outline px-6" href="mailto:cobradecisionteam@gmail.com">
                {t("about.cta_propose_talk", locale)}
              </a>
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
