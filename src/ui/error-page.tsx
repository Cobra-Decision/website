import type { Locale } from "../lib/i18n/translations";
import { t } from "../lib/i18n/context";
import { PublicHeader } from "./public-header";
import { Footer } from "./footer";
import { AlertTriangleIcon } from "./icons";

export interface ErrorPageProps {
  statusCode: 404 | 500 | 403 | number;
  title?: string;
  message?: string;
  locale?: Locale;
}

export const ErrorPage = ({
  statusCode,
  title,
  message,
  locale = "en",
}: ErrorPageProps) => {
  const displayTitle =
    title ??
    (statusCode === 404
      ? t("error.404.title", locale)
      : statusCode === 403
      ? t("error.403.title", locale)
      : t("error.500.title", locale));

  const displaySubtitle =
    message ??
    (statusCode === 404
      ? t("error.404.subtitle", locale)
      : statusCode === 403
      ? t("error.403.subtitle", locale)
      : t("error.500.subtitle", locale));

  return (
    <div class="overflow-x-hidden bg-base-100 min-h-screen flex flex-col justify-between">
      <PublicHeader locale={locale} />

      <main class="flex-1 flex items-center justify-center px-5 py-16 sm:px-8">
        <div class="relative mx-auto max-w-xl text-center">
          <div class="absolute -inset-6 rounded-[3rem] bg-primary/10 blur-3xl -z-10"></div>

          <div class="rounded-3xl border border-base-200 bg-base-100/90 p-8 sm:p-12 shadow-2xl backdrop-blur">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error mb-6">
              <AlertTriangleIcon class="h-8 w-8" strokeWidth={2.2} />
            </div>

            <div class="inline-flex items-center justify-center mb-3">
              <span class="inline-block rounded-full border border-error/40 bg-error/10 px-4 py-1 font-mono text-sm font-bold text-error tracking-wider">
                {statusCode}
              </span>
            </div>

            <h1 class="text-3xl font-bold tracking-tight text-base-content sm:text-4xl mt-2">
              {displayTitle}
            </h1>

            <p class="mt-4 text-base leading-7 text-base-content/70">
              {displaySubtitle}
            </p>

            <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a class="btn btn-primary px-6 shadow-md" href="/">
                {t("error.back_home", locale)}
              </a>
              <a class="btn btn-ghost px-5" href="/#meets">
                {t("error.explore_meets", locale)}
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
};
