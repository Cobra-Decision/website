import type { Locale } from "../lib/i18n/translations";
import { t, isRtl } from "../lib/i18n/context";
import { LanguageSwitch } from "./language-switch";
import { MenuIcon, CopyIcon, CheckIcon, LinkIcon } from "./icons";

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
      <div class="card dropdown-content z-50 mt-3 w-64 border border-base-300 bg-base-100 shadow-2xl" tabindex={0}>
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
      <MenuIcon class="h-5 w-5" />
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

export const buildMeetingAttributionUrl = (
  origin: string,
  meetId: string,
  platform: string
) => `${origin.replace(/\/+$/, "")}/meets/${encodeURIComponent(meetId)}?platform=${encodeURIComponent(platform)}`;

export const MeetingLinkGenerator = ({
  meetId,
  platforms = DEFAULT_PLATFORMS,
  botUsername = process.env.TELEGRAM_BOT_USERNAME || "CobraDecisionBot",
}: {
  meetId: string;
  platforms?: PlatformOption[];
  botUsername?: string;
}) => {
  const containerId = `meet-link-gen-${meetId}`;
  const tgDirectLink = `https://t.me/${botUsername}?startapp=meet_${meetId}`;

  return (
    <div
      id={containerId}
      class="card border border-base-300 bg-base-200/60 p-4 rounded-xl space-y-4"
    >
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-sm text-base-content">Meeting Links & Attribution</h4>
        <span class="text-xs badge badge-ghost font-mono">/meets/{meetId}</span>
      </div>

      {/* Telegram Mini App Direct Link */}
      <div class="p-3 bg-base-100 rounded-lg border border-base-300 space-y-2">
        <div class="flex items-center justify-between">
          <label for={`tg-direct-url-${meetId}`} class="label-text font-semibold text-xs flex items-center gap-1.5 text-base-content">
            <LinkIcon class="h-3.5 w-3.5 text-primary" />
            Telegram Mini App Direct Link
          </label>
          <span class="text-[11px] text-base-content/60">Opens directly in Telegram</span>
        </div>
        <div class="flex gap-2">
          <input
            id={`tg-direct-url-${meetId}`}
            type="text"
            readonly
            dir="ltr"
            aria-label="Telegram Mini App direct link"
            class="input input-bordered input-sm w-full font-mono text-xs bg-base-200/50 text-base-content select-all"
            value={tgDirectLink}
          />
          <button
            type="button"
            class="btn btn-primary btn-sm gap-1 shrink-0"
            aria-label="Copy Telegram Mini App direct link"
            onclick={`
              const text = '${tgDirectLink}';
              const doCopy = (val) => {
                if (navigator.clipboard && window.isSecureContext) {
                  return navigator.clipboard.writeText(val);
                }
                const el = document.createElement('textarea');
                el.value = val;
                el.style.position = 'fixed';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.focus();
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                return Promise.resolve();
              };
              doCopy(text).finally(() => {
                const notice = document.getElementById('tg-copied-notice-${meetId}');
                if (notice) {
                  notice.classList.remove('opacity-0');
                  setTimeout(() => notice.classList.add('opacity-0'), 2500);
                }
              });
            `}
          >
            <CopyIcon class="h-3.5 w-3.5" />
            Copy Bot Link
          </button>
        </div>
        <div class="h-4 flex items-center">
          <span
            id={`tg-copied-notice-${meetId}`}
            class="text-xs font-semibold text-success flex items-center gap-1 transition-opacity duration-200 opacity-0"
          >
            <CheckIcon class="h-3.5 w-3.5" /> Copied Telegram Mini App link!
          </span>
        </div>
      </div>

      {/* General Attributed URL Generator */}
      <div class="space-y-2">
        <p class="text-xs text-base-content/60">
          Generate attribution links to track RSVPs across other marketing platforms.
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="form-control w-full">
            <span class="label-text font-medium text-xs">Destination Platform</span>
            <select
              id={`platform-select-${meetId}`}
              class="select select-bordered select-sm w-full"
              onchange={`const input = document.getElementById('attributed-url-${meetId}'); if (input) input.value = window.location.origin + '/meets/${meetId}?platform=' + this.value;`}
            >
              {platforms.map((p) => (
                <option key={p.slug} value={p.slug} selected={p.slug === "telegram"}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </label>

          <label class="form-control w-full">
            <span class="label-text font-medium text-xs">Generated Attributed URL</span>
            <input
              id={`attributed-url-${meetId}`}
              type="text"
              readonly
              dir="ltr"
              aria-label="Generated attributed web URL"
              class="input input-bordered input-sm w-full font-mono text-xs bg-base-100 text-base-content select-all"
              value={`/meets/${meetId}?platform=telegram`}
            />
          </label>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span
            id={`copied-notice-${meetId}`}
            class="text-xs font-semibold text-success flex items-center gap-1 transition-opacity duration-200 opacity-0"
          >
            <CheckIcon class="h-3.5 w-3.5" /> Copied to clipboard!
          </span>
          <span id={`copy-desc-${meetId}`} class="text-xs text-base-content/50">
            Copy tracking URL for web browsers
          </span>

          <button
            type="button"
            class="btn btn-outline btn-sm gap-1.5"
            aria-label="Copy web link"
            onclick={`
              const select = document.getElementById('platform-select-${meetId}');
              const platform = select ? select.value : 'telegram';
              const text = window.location.origin + '/meets/${meetId}?platform=' + platform;
              const input = document.getElementById('attributed-url-${meetId}');
              if (input) input.value = text;

              const doCopy = (val) => {
                if (navigator.clipboard && window.isSecureContext) {
                  return navigator.clipboard.writeText(val);
                }
                const el = document.createElement('textarea');
                el.value = val;
                el.style.position = 'fixed';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.focus();
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                return Promise.resolve();
              };

              doCopy(text).finally(() => {
                const notice = document.getElementById('copied-notice-${meetId}');
                const desc = document.getElementById('copy-desc-${meetId}');
                if (notice) notice.classList.remove('opacity-0');
                if (desc) desc.classList.add('hidden');
                setTimeout(() => {
                  if (notice) notice.classList.add('opacity-0');
                  if (desc) desc.classList.remove('hidden');
                }, 2500);
              });
            `}
          >
            <CopyIcon class="h-3.5 w-3.5" />
            Copy Web Link
          </button>
        </div>
      </div>
    </div>
  );
};
