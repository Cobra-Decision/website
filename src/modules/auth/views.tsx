import type { Locale } from "../../lib/i18n/translations";
import { t } from "../../lib/i18n/context";
import { LanguageSwitch } from "../../ui/language-switch";
import { TagSelector } from "../../ui/tag-selector";
import { PhoneInput } from "../../ui/phone-input";
import type { Tag } from "../events/types";

const Captcha = () => (
  <div class="rounded-box border border-base-300 bg-base-200 p-3">
    <altcha-widget challenge="/auth/altcha/challenge"></altcha-widget>
  </div>
);

const Field = ({
  label,
  name,
  type = "text",
  required = false,
  optionalLabel,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  optionalLabel?: string;
}) => (
  <label class="form-control w-full">
    <span class="label">
      <span class="label-text font-medium">{label}</span>
      {!required && <span class="label-text-alt opacity-70">{optionalLabel ?? "Optional"}</span>}
    </span>
    <input class="input input-bordered w-full focus:input-primary" name={name} type={type} required={required} autocomplete={name} />
  </label>
);

const AuthCard = ({
  title,
  subtitle,
  children,
  locale = "en",
}: {
  title: string;
  subtitle: string;
  children: any;
  locale?: Locale;
}) => (
  <main class="grid min-h-screen place-items-center px-4 py-10">
    <div class="card w-full max-w-xl border border-base-300 bg-base-100 shadow-2xl">
      <div class="card-body gap-6 p-6 sm:p-10">
        <div class="flex items-start justify-between gap-4">
          <div>
            <a class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href="/">
              <img src="/favicon.svg" alt="CobraDecision" class="h-5 w-auto" />
              <span>{t("brand.name", locale)}</span>
            </a>
            <h1 class="mt-2 text-2xl sm:text-3xl font-bold">{title}</h1>
            <p class="mt-1 text-sm text-base-content/60">{subtitle}</p>
          </div>
          <LanguageSwitch currentLocale={locale} size="xs" />
        </div>
        {children}
      </div>
    </div>
  </main>
);

export const Login = ({ locale = "en" }: { locale?: Locale }) => (
  <AuthCard title={t("auth.welcome_back", locale)} subtitle={t("auth.login_subtitle", locale)} locale={locale}>
    <form class="space-y-4" hx-post="/auth/login" hx-target="#auth-result" hx-swap="innerHTML">
      <Field label={t("auth.identifier", locale)} name="identifier" required />
      <Field label={t("auth.password", locale)} name="password" type="password" required />
      <Captcha />
      <div id="auth-result"></div>
      <button class="btn btn-primary w-full" type="submit">
        <span class="htmx-indicator loading loading-spinner loading-sm"></span>
        {t("auth.sign_in_btn", locale)}
      </button>
    </form>
    <p class="text-center text-sm">
      {t("auth.new_here", locale)}{" "}
      <a class="link link-primary font-medium" href="/auth/register">
        {t("auth.create_account_link", locale)}
      </a>
    </p>
  </AuthCard>
);

export const Register = ({ tags, locale = "en" }: { tags: Tag[]; locale?: Locale }) => (
  <AuthCard title={t("auth.create_account", locale)} subtitle={t("auth.register_subtitle", locale)} locale={locale}>
    <form class="space-y-4" hx-post="/auth/register" hx-target="#auth-result" hx-swap="innerHTML">
      <div class="grid gap-4 sm:grid-cols-2">
        <Field label={t("auth.first_name", locale)} name="first_name" optionalLabel={t("auth.optional", locale)} />
        <Field label={t("auth.last_name", locale)} name="last_name" optionalLabel={t("auth.optional", locale)} />
        <Field label={t("auth.username", locale)} name="username" optionalLabel={t("auth.optional", locale)} />
        <Field label={t("auth.email", locale)} name="email" type="email" required />
        <div class="sm:col-span-2">
          <PhoneInput
            name="phone"
            locale={locale}
            label={t("auth.phone", locale)}
            optional={true}
          />
        </div>
      </div>

      <div class="divider text-xs uppercase text-base-content/50">{t("auth.password", locale)}</div>

      <div class="grid gap-4 sm:grid-cols-2">
        <Field label={t("auth.password", locale)} name="password" type="password" required />
        <Field label={t("auth.confirm_password", locale)} name="password_confirmation" type="password" required />
      </div>

      <div class="divider text-xs uppercase text-base-content/50">{t("auth.preferred_tags", locale)}</div>

      {/* Preferred Tags Selector with min 3 required */}
      <TagSelector
        tags={tags}
        selectedTagIds={[]}
        minRequired={3}
        name="tagIds"
        locale={locale}
        title={t("auth.preferred_tags", locale)}
        subtitle={t("auth.preferred_tags_desc", locale)}
      />

      <Captcha />
      <div id="auth-result"></div>
      <button class="btn btn-primary w-full" type="submit">
        <span class="htmx-indicator loading loading-spinner loading-sm"></span>
        {t("auth.create_account_btn", locale)}
      </button>
    </form>
    <p class="text-center text-sm">
      {t("auth.already_registered", locale)}{" "}
      <a class="link link-primary font-medium" href="/auth">
        {t("auth.sign_in_link", locale)}
      </a>
    </p>
  </AuthCard>
);

export type Profile = {
  id?: string;
  email: string;
  username: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  role_title: string;
  timezone?: string;
  telegram_id?: string | null;
};

export const Dashboard = ({ user }: { user: Profile }) => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.email;
  return <div class="min-h-screen">
    <header class="navbar border-b border-base-300 bg-base-100 px-4 shadow-sm sm:px-8">
      <div class="flex-1"><a class="text-xl font-bold" href="/dashboard/user">Dashboard</a></div>
      <div class="dropdown dropdown-end" x-data>
        <button class="btn btn-ghost gap-3" tabindex={0}><div class="avatar placeholder"><div class="w-9 rounded-full bg-primary text-primary-content"><span>{name[0]?.toUpperCase()}</span></div></div><span class="hidden text-left sm:block"><span class="block text-sm font-semibold">{name}</span><span class="block text-xs opacity-60">{user.role_title}</span></span></button>
        <div class="card dropdown-content z-10 mt-3 w-72 border border-base-300 bg-base-100 shadow-xl" tabindex={0}><div class="card-body gap-2 p-5"><p class="font-semibold">{name}</p><p class="text-sm text-base-content/60">{user.email}</p>{user.phone && <p class="text-sm text-base-content/60">{user.phone}</p>}<a class="btn btn-outline btn-sm mt-2" href="/dashboard/account">Edit profile</a><div class="divider my-1"></div><form hx-post="/auth/logout"><button class="btn btn-error btn-outline btn-sm w-full" type="submit">Log out</button></form></div></div>
      </div>
    </header>
    <main class="container mx-auto p-6 sm:p-10"><div class="hero rounded-box bg-base-100 py-16 shadow-sm"><div class="hero-content text-center"><div><h1 class="text-4xl font-bold">Welcome, {name}</h1><p class="mt-3 text-base-content/60">Your account is ready.</p>{user.role_title === "Super Admin" && <a class="btn btn-primary mt-6" href="/dashboard/admin">Open admin dashboard</a>}</div></div></div></main>
  </div>;
};

export const ProfileForm = ({ user }: { user: Profile }) => <main class="mx-auto max-w-2xl p-6 sm:p-10"><div class="card bg-base-100 shadow"><div class="card-body"><h1 class="card-title">Your profile</h1><form class="grid gap-4 mt-4 sm:grid-cols-2" hx-post="/dashboard/profile" hx-target="#profile-result">{[["Username", "username"], ["First name", "first_name"], ["Last name", "last_name"]].map(([label, name]) => <label class="form-control"><span class="label-text">{label}</span><input class="input input-bordered w-full" name={name} value={String(user[name as keyof Profile] ?? "")} /></label>)}<div class="sm:col-span-2"><PhoneInput initialPhone={user.phone} name="phone" optional={true} /></div><label class="form-control sm:col-span-2"><span class="label-text">New password</span><input class="input input-bordered w-full" name="password" type="password" /></label><label class="form-control sm:col-span-2"><span class="label-text">Confirm new password</span><input class="input input-bordered w-full" name="password_confirmation" type="password" /></label><div id="profile-result" class="sm:col-span-2"></div><div class="modal-action sm:col-span-2"><a class="btn" href="/dashboard/user">Cancel</a><button class="btn btn-primary">Save changes</button></div></form></div></div></main>;
