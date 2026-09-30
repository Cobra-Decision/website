import type { Locale } from "../lib/i18n/translations";
import { Button } from "./forms";

export const LanguageSwitch = ({
  currentLocale = "en",
  size = "xs",
  className = "",
}: {
  currentLocale?: Locale;
  size?: "xs" | "sm" | "md";
  className?: string;
}) => {
  return (
    <div class={`join ${className}`}>
      <Button
        href="/locale/en"
        size={size}
        variant={currentLocale === "en" ? "primary" : "ghost"}
        class={`join-item ${currentLocale === "en" ? "font-bold shadow-xs" : ""}`}
        aria-label="Switch to English"
      >
        EN
      </Button>
      <Button
        href="/locale/fa"
        size={size}
        variant={currentLocale === "fa" ? "primary" : "ghost"}
        class={`join-item ${currentLocale === "fa" ? "font-bold shadow-xs" : ""}`}
        aria-label="تغییر به زبان فارسی"
      >
        فا
      </Button>
    </div>
  );
};
