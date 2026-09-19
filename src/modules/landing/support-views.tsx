import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";
import { LanguageSwitch } from "../../ui/language-switch";
import { Footer } from "../../ui/footer";

export const SupportView = ({ locale = "en" }: { locale?: Locale }) => {
  const allocations = [
    { title: t("support.alloc.server", locale), desc: t("support.alloc.server_desc", locale), pct: "50%" },
    { title: t("support.alloc.archive", locale), desc: t("support.alloc.archive_desc", locale), pct: "30%" },
    { title: t("support.alloc.tools", locale), desc: t("support.alloc.tools_desc", locale), pct: "15%" },
    { title: t("support.alloc.community", locale), desc: t("support.alloc.community_desc", locale), pct: "5%" },
  ];

  const faqs = [
    { q: t("support.faq.q1", locale), a: t("support.faq.a1", locale) },
    { q: t("support.faq.q2", locale), a: t("support.faq.a2", locale) },
    { q: t("support.faq.q3", locale), a: t("support.faq.a3", locale) },
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
            <a class="link-hover" href="/about">{t("nav.about", locale)}</a>
            <a class="text-primary font-bold" href="/support">{t("nav.support", locale)}</a>
            <a class="link-hover" href="/#contact">{t("nav.contact", locale)}</a>
          </div>
          <div class="flex-none gap-3 ps-4">
            <LanguageSwitch currentLocale={locale} size="xs" />
            <a class="btn btn-primary btn-sm px-5" href="/auth">{t("nav.sign_in", locale)}</a>
          </div>
        </nav>
      </header>

      <main class="space-y-20 py-12 sm:py-20">
        {/* Hero Section */}
        <section class="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <div class="inline-flex items-center justify-center mb-6 max-w-full">
            <span class="inline-block rounded-full border border-success/40 bg-success/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-success text-center leading-normal">
              {t("support.hero_badge", locale)}
            </span>
          </div>
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            {t("support.hero_title", locale)}
          </h1>
          <p class="mt-6 mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed text-base-content/75">
            {t("support.hero_subtitle", locale)}
          </p>
        </section>

        {/* Yavar Crowdfunding Widget */}
        <section class="mx-auto max-w-3xl px-5 sm:px-8">
          <div class="card border border-base-300 bg-base-200/50 p-6 sm:p-10 shadow-lg text-center">
            <h2 class="text-2xl font-bold text-base-content mb-2">{t("support.yavar_title", locale)}</h2>
            <p class="text-sm text-base-content/70 mb-8 max-w-lg mx-auto">
              {t("support.yavar_desc", locale)}
            </p>

            <div style="display:flex;justify-content:center;width:100%">
              <iframe
                src="https://donate.sudoshz.ir/embed/widget.php?slug=cobra-decision&theme=dark&lang=fa"
                title="حمایت با یاور"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                style="width:100%;max-width:420px;height:280px;border:0;border-radius:16px;overflow:hidden;display:block;margin:0 auto"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              ></iframe>
            </div>

            <div class="mt-6">
              <a
                class="btn btn-outline btn-sm font-medium"
                href="https://donate.sudoshz.ir/u/cobra-decision"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("support.yavar_direct_btn", locale)}
              </a>
            </div>
          </div>
        </section>

        {/* Fund Allocation Breakdown */}
        <section class="mx-auto max-w-7xl px-5 sm:px-8">
          <div class="text-center max-w-2xl mx-auto mb-12">
            <h2 class="text-3xl font-bold tracking-tight">{t("support.allocation_title", locale)}</h2>
            <p class="mt-3 text-base-content/65">{t("support.allocation_desc", locale)}</p>
          </div>
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {allocations.map((item) => (
              <div key={item.title} class="card border border-base-300 bg-base-100 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div class="badge badge-primary font-mono font-bold mb-4">{item.pct}</div>
                  <h3 class="font-bold text-lg text-base-content">{item.title}</h3>
                  <p class="mt-2 text-sm text-base-content/70 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Independent & Open Stewardship */}
        <section class="mx-auto max-w-4xl px-5 sm:px-8">
          <div class="card border border-primary/20 bg-primary/5 p-8 rounded-3xl text-center sm:text-start">
            <h3 class="text-xl font-bold text-base-content">{t("support.stewardship_title", locale)}</h3>
            <p class="mt-2 text-sm text-base-content/75 leading-relaxed">{t("support.stewardship_desc", locale)}</p>
          </div>
        </section>

        {/* FAQ Section */}
        <section class="mx-auto max-w-4xl px-5 sm:px-8">
          <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 class="text-3xl font-bold tracking-tight">{t("support.faq_title", locale)}</h2>
          </div>
          <div class="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={faq.q} class="collapse collapse-plus border border-base-300 bg-base-100 rounded-box shadow-xs" open={idx === 0}>
                <summary class="collapse-title font-semibold text-base sm:text-lg">
                  {faq.q}
                </summary>
                <div class="collapse-content text-sm text-base-content/75 leading-relaxed">
                  <p>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
};
