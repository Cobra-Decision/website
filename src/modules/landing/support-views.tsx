import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";
import { PublicHeader } from "../../ui/public-header";
import { Footer } from "../../ui/footer";

export const SupportView = ({ locale = "en" }: { locale?: Locale }) => {
  const faqs = [
    { q: t("support.faq.q1", locale), a: t("support.faq.a1", locale) },
    { q: t("support.faq.q2", locale), a: t("support.faq.a2", locale) },
    { q: t("support.faq.q3", locale), a: t("support.faq.a3", locale) },
  ];

  return (
    <div class="overflow-x-hidden bg-base-100 min-h-screen">
      <PublicHeader locale={locale} activePage="support" />

      <main class="space-y-24 py-12 sm:py-20">
        {/* Hero Section */}
        <section
          id="purpose"
          class="mx-auto max-w-5xl px-5 sm:px-8 text-center scroll-mt-24"
        >
          <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-base-content leading-tight">
            <a
              href="#purpose"
              class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group"
            >
              <span>{t("support.hero_title", locale)}</span>
              <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-2xl font-mono">
                #
              </span>
            </a>
          </h1>
          <div class="mt-8 mx-auto max-w-3xl space-y-4 text-lg sm:text-xl leading-relaxed text-base-content/80">
            <p>{t("support.hero_subtitle", locale)}</p>
            <p class="text-base sm:text-lg text-base-content/65 leading-relaxed">
              {t("support.hero_stewardship", locale)}
            </p>
          </div>
        </section>

        {/* Yavar Crowdfunding & Transparency Main Grid */}
        <section
          id="donate"
          class="mx-auto max-w-7xl px-5 sm:px-8 scroll-mt-24"
        >
          <div class="grid gap-8 lg:grid-cols-12 items-stretch">
            {/* Direct Yavar Donation Card / Widget */}
            <div class="lg:col-span-6 card border border-base-300 bg-base-200/50 p-6 sm:p-10 shadow-sm flex flex-col justify-between text-center">
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold text-base-content mb-3">
                  <a
                    href="#donate"
                    class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group"
                  >
                    <span>{t("support.yavar_title", locale)}</span>
                    <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">
                      #
                    </span>
                  </a>
                </h2>
                <p class="text-sm sm:text-base text-base-content/70 mb-8 max-w-md mx-auto leading-relaxed">
                  {t("support.yavar_desc", locale)}
                </p>

                <div class="flex justify-center w-full">
                  <iframe
                    src="https://donate.sudoshz.ir/embed/widget.php?slug=cobra-decision&theme=dark&lang=fa"
                    title={t("support.yavar_title", locale)}
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                    class="w-full max-w-[420px] h-[287px] border-0 rounded-2xl overflow-hidden block mx-auto"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  ></iframe>
                </div>
              </div>

              <div class="mt-8 pt-4 border-t border-base-300/60">
                <a
                  class="btn btn-outline btn-sm sm:btn-md font-medium w-full sm:w-auto"
                  href="https://donate.sudoshz.ir/u/cobra-decision"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("support.yavar_direct_btn", locale)}
                </a>
              </div>
            </div>

            {/* Transparency & Financial Commitment Card */}
            <div
              id="transparency"
              class="lg:col-span-6 card border border-base-300 bg-base-100 p-6 sm:p-10 shadow-sm flex flex-col justify-between scroll-mt-24"
            >
              <div class="space-y-5 text-start">
                <div class="inline-flex items-center gap-2 text-primary text-xs sm:text-sm font-semibold tracking-wider">
                  <span class="inline-block h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></span>
                  <span>{t("support.transparency_badge", locale)}</span>
                </div>
                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-base-content leading-tight">
                  <a
                    href="#transparency"
                    class="hover:text-primary transition-colors inline-flex items-center gap-2 group"
                  >
                    <span>{t("support.transparency_title", locale)}</span>
                    <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">
                      #
                    </span>
                  </a>
                </h2>
                <p class="text-sm sm:text-base leading-relaxed text-base-content/75">
                  {t("support.transparency_desc", locale)}
                </p>
              </div>

              <div class="mt-8 pt-6 border-t border-base-300 space-y-4">
                <div class="text-start">
                  <h3 class="font-bold text-base text-base-content">
                    {t("support.transparency_track_title", locale)}
                  </h3>
                  <p class="text-xs sm:text-sm text-base-content/65 mt-1 leading-relaxed">
                    {t("support.transparency_track_desc", locale)}
                  </p>
                </div>
                <a
                  class="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto shadow-xs"
                  href="https://donate.sudoshz.ir/u/cobra-decision"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("support.transparency_track_btn", locale)}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" class="mx-auto max-w-5xl px-5 sm:px-8 scroll-mt-24">
          <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 class="text-3xl sm:text-4xl font-bold tracking-tight">
              <a
                href="#faq"
                class="hover:text-primary transition-colors inline-flex items-center justify-center gap-2 group"
              >
                <span>{t("support.faq_title", locale)}</span>
                <span class="text-base-content/30 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity text-xl font-mono">
                  #
                </span>
              </a>
            </h2>
          </div>
          <div class="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                class="collapse collapse-plus border border-base-300 bg-base-100 rounded-box shadow-xs"
              >
                <input type="checkbox" defaultChecked={idx === 0} aria-label={faq.q} />
                <div class="collapse-title font-semibold text-base sm:text-lg">
                  {faq.q}
                </div>
                <div class="collapse-content text-sm text-base-content/75 leading-relaxed">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
};
