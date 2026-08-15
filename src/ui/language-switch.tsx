import type { Locale } from "../lib/i18n/translations";

export const LanguageSwitch = ({
  currentLocale = "en",
  size = "xs",
  className = "",
}: {
  currentLocale?: Locale;
  size?: "xs" | "sm" | "md";
  className?: string;
}) => {
  const sizeClass = size === "xs" ? "btn-xs" : size === "sm" ? "btn-sm" : "btn-md";

  return (
    <div class={`join ${className}`}>
      <a
        href="/locale/en"
        class={`btn ${sizeClass} join-item ${currentLocale === "en" ? "btn-primary font-bold shadow-xs" : "btn-ghost"}`}
        aria-label="Switch to English"
      >
        EN
      </a>
      <a
        href="/locale/fa"
        class={`btn ${sizeClass} join-item ${currentLocale === "fa" ? "btn-primary font-bold shadow-xs" : "btn-ghost"}`}
        aria-label="تغییر به زبان فارسی"
      >
        فا
      </a>
    </div>
  );
};
