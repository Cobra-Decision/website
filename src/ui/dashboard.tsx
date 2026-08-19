import type { Locale } from "../lib/i18n/translations";
import { t, isRtl } from "../lib/i18n/context";
import { LanguageSwitch } from "./language-switch";

export type DashboardUser = {
  name: string;
  email: string;
  role?: string;
  isSuperAdmin?: boolean;
};

export type PlatformOption = {
  slug: string;
  name: string;
};

export const DEFAULT_PLATFORMS: PlatformOption[] = [
  { slug: "gmail", name: "Gmail" },
  { slug: "telegram", name: "Telegram" },
  { slug: "youtube", name: "YouTube" },
  { slug: "linkedin", name: "LinkedIn" },
  { slug: "github", name: "GitHub" },
  { slug: "instagram", name: "Instagram" },
  { slug: "reddit", name: "Reddit" },
  { slug: "mastodon", name: "Mastodon" },
  { slug: "deltachat", name: "Delta Chat" },
];

export const UserProfileDropdown = ({
  user,
  currentView,
  locale = "en",
}: {
  user: DashboardUser;
  currentView: "admin" | "user";
  locale?: Locale;
}) => {
  const isAdmin = user.isSuperAdmin || user.role === "Super Admin" || user.role === "admin";
  const initial = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  const rtl = isRtl(locale);

  return (
    <div class="dropdown dropdown-end" x-data>
      <button class="btn btn-ghost gap-3" tabindex={0} aria-label="User profile menu">
        <div class="avatar placeholder">
          <div class="w-9 rounded-full bg-primary text-primary-content font-bold">
            <span>{initial}</span>
          </div>
        </div>
        <span class="hidden text-start sm:block">
          <span class="block text-sm font-semibold">{user.name}</span>
          {user.role && <span class="block text-xs opacity-60">{user.role}</span>}
        </span>
      </button>
      <div class="card dropdown-content z-20 mt-3 w-64 border border-base-300 bg-base-100 shadow-xl" tabindex={0}>
        <div class="card-body gap-2 p-4">
          <p class="font-semibold">{user.name}</p>
          <p class="text-xs text-base-content/60">{user.email}</p>
          {user.role && (
            <div>
              <span class="badge badge-sm badge-outline">{user.role}</span>
            </div>
          )}

          <a class="btn btn-outline btn-sm mt-2" href={`/dashboard/account?from=${currentView}`}>
            {t("nav.account", locale)}
          </a>

          {isAdmin && (
            currentView === "admin" ? (
              <a class="btn btn-secondary btn-outline btn-sm mt-1" href="/dashboard/user/meets">
                {rtl ? "مشاهده نمای کاربری" : "Switch to User View"}
              </a>
            ) : (
              <a class="btn btn-primary btn-outline btn-sm mt-1" href="/dashboard/admin">
                {rtl ? "مشاهده داشبورد مدیریت" : "Switch to Admin Dashboard"}
              </a>
            )
          )}

          <div class="divider my-1"></div>
          <form hx-post="/auth/logout">
            <button class="btn btn-error btn-outline btn-sm w-full" type="submit">
              {t("nav.logout", locale)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const DashboardNavbar = ({
  drawerId,
  brandHref,
  user,
  currentView,
  locale = "en",
}: {
  drawerId: string;
  brandHref: string;
  user?: DashboardUser;
  currentView: "admin" | "user";
  locale?: Locale;
}) => (
  <header class="navbar min-h-16 border-b border-base-300 bg-base-100 px-4 shadow-sm sm:px-8">
    <label for={drawerId} class="btn btn-square btn-ghost lg:hidden" aria-label="Toggle navigation drawer">
      ☰
    </label>
    <div class="flex-1">
      <a class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight" href={brandHref}>
        <img src="/favicon.svg" alt="CobraDecision" class="h-7 w-auto" />
        <span>{t("brand.name", locale)}<span class="text-primary">.</span></span>
      </a>
    </div>
    <div class="flex items-center gap-3">
      <LanguageSwitch currentLocale={locale} size="xs" />
      {user && <UserProfileDropdown user={user} currentView={currentView} locale={locale} />}
    </div>
  </header>
);

export const MeetingLinkGenerator = ({
  meetId,
  platforms = DEFAULT_PLATFORMS,
}: {
  meetId: string;
  platforms?: PlatformOption[];
}) => (
  <div
    class="card border border-base-300 bg-base-200/60 p-4 rounded-xl space-y-3"
    x-data={`{
      platform: 'telegram',
      baseUrl: window.location.origin,
      copied: false,
      get generatedUrl() {
        return this.baseUrl + '/meets/${meetId}?platform=' + this.platform;
      }
    }`}
  >
    <div class="flex items-center justify-between">
      <h4 class="font-bold text-sm text-base-content">Attributed Meeting Link Generator</h4>
      <span class="text-xs badge badge-ghost font-mono">/meets/{meetId}</span>
    </div>
    <p class="text-xs text-base-content/60">
      Generate attribution links to track RSVPs and attendees across marketing platforms.
    </p>

    <div class="grid gap-3 sm:grid-cols-2">
      <label class="form-control w-full">
        <span class="label-text font-medium text-xs">Destination Platform</span>
        <select class="select select-bordered select-sm w-full" x-model="platform">
          {platforms.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} ({p.slug})
            </option>
          ))}
        </select>
      </label>

      <label class="form-control w-full">
        <span class="label-text font-medium text-xs">Generated Attributed URL</span>
        <input
          type="text"
          readonly
          class="input input-bordered input-sm w-full font-mono text-xs bg-base-100 text-base-content select-all"
          x-bind:value="generatedUrl"
        />
      </label>
    </div>

    <div class="flex items-center justify-between pt-1">
      <span
        x-show="copied"
        x-transition
        class="text-xs font-semibold text-success flex items-center gap-1"
        style="display: none;"
      >
        ✓ Copied to clipboard!
      </span>
      <span x-show="!copied" class="text-xs text-base-content/50">
        Copy this tracking URL to share on chosen platform
      </span>

      <button
        type="button"
        class="btn btn-primary btn-sm"
        x-on:click="navigator.clipboard.writeText(generatedUrl); copied = true; setTimeout(() => copied = false, 2500)"
      >
        Copy Link
      </button>
    </div>
  </div>
);
