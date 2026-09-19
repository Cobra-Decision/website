import type { Locale } from "../lib/i18n/translations";
import { t } from "../lib/i18n/context";
import { LanguageSwitch } from "./language-switch";
import { MenuIcon, XIcon } from "./icons";

export interface PublicHeaderProps {
  locale?: Locale;
  activePage?: "landing" | "about" | "support" | "events" | "dashboard";
}

export const PublicHeader = ({ locale = "en", activePage }: PublicHeaderProps) => {
  const isLanding = activePage === "landing";
  const isAbout = activePage === "about";
  const isSupport = activePage === "support";

  const links = [
    {
      href: isLanding ? "#how-it-works" : "/#how-it-works",
      label: t("nav.how_it_works", locale),
      active: false,
    },
    {
      href: isLanding ? "#meets" : "/#meets",
      label: t("nav.meets", locale),
      active: false,
    },
    {
      href: "/about",
      label: t("nav.about", locale),
      active: isAbout,
    },
    {
      href: "/support",
      label: t("nav.support", locale),
      active: isSupport,
    },
    {
      href: isLanding ? "#contact" : "/#contact",
      label: t("nav.contact", locale),
      active: false,
    },
  ];

  return (
    <header
      x-data="{ open: false }"
      class="border-b border-base-200 bg-base-100/90 sticky top-0 z-30 backdrop-blur"
    >
      <nav class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:min-h-20 sm:px-8">
        {/* Brand Logo */}
        <div class="flex shrink-0 items-center">
          <a class="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight sm:text-xl" href="/">
            <img src="/favicon.svg" alt="CobraDecision" width="32" height="32" class="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
            <span class="whitespace-nowrap">
              {t("brand.name", locale)}
              <span class="text-primary">.</span>
            </span>
          </a>
        </div>

        {/* Desktop Navigation Links */}
        <div class="hidden items-center gap-6 text-sm font-medium lg:flex lg:gap-7">
          {links.map((link) => (
            <a
              key={link.href}
              class={link.active ? "text-primary font-bold" : "link-hover transition-colors hover:text-primary"}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action Controls & Mobile Toggle */}
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitch currentLocale={locale} size="xs" />
          <a class="btn btn-primary btn-xs px-3 sm:btn-sm sm:px-5 hidden md:inline-flex" href="/auth">
            {t("nav.sign_in", locale)}
          </a>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            class="btn btn-ghost btn-square btn-sm shrink-0 lg:hidden"
            aria-label="Toggle Navigation Menu"
            aria-controls="mobile-nav-dropdown"
            x-bind:aria-expanded="open"
            x-on:click="open = !open"
          >
            <span x-show="!open">
              <MenuIcon class="h-5 w-5" />
            </span>
            <span x-show="open" style="display: none;">
              <XIcon class="h-5 w-5" />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div
        id="mobile-nav-dropdown"
        x-show="open"
        {...{
          "x-transition:enter": "transition ease-out duration-200",
          "x-transition:enter-start": "opacity-0 -translate-y-2",
          "x-transition:enter-end": "opacity-100 translate-y-0",
          "x-transition:leave": "transition ease-in duration-150",
          "x-transition:leave-start": "opacity-100 translate-y-0",
          "x-transition:leave-end": "opacity-0 -translate-y-2",
          "x-on:click.outside": "open = false",
          "x-on:keydown.escape.window": "open = false",
        }}
        style="display: none;"
        class="border-t border-base-200 bg-base-100/95 px-4 py-4 shadow-xl backdrop-blur lg:hidden"
      >
        <div class="mb-3 md:hidden">
          <a class="btn btn-primary btn-sm w-full" href="/auth">
            {t("nav.sign_in", locale)}
          </a>
        </div>
        <ul class="menu menu-md w-full gap-1 p-0">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                x-on:click="open = false"
                class={`flex items-center justify-between rounded-lg px-4 py-3 font-medium transition-colors ${
                  link.active
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-base-content/85 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                <span>{link.label}</span>
                {link.active && (
                  <span class="badge badge-primary badge-xs" aria-hidden="true"></span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
};
