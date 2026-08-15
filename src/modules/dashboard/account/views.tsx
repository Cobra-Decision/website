import type { Profile } from "../../auth/views";
import type { Tag } from "../../events/types";
import { TagSelector } from "../../../ui/tag-selector";
import type { Locale } from "../../../lib/i18n/translations";
import { t, isRtl } from "../../../lib/i18n/context";
import { LanguageSwitch } from "../../../ui/language-switch";

export function AccountPage({
  user,
  from,
  allTags = [],
  userTagIds = [],
  locale = "en",
}: {
  user: Profile;
  from: "user" | "admin";
  allTags?: Tag[];
  userTagIds?: string[];
  locale?: Locale;
}) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.email;
  const isAdmin = user.role_title === "Super Admin" || user.role_title === "admin";
  const backHref = from === "admin" && isAdmin ? "/dashboard/admin" : "/dashboard/user/meets";
  const rtl = isRtl(locale);

  return (
    <div class="min-h-screen bg-base-200 py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto space-y-6">
        {/* Header Profile Card & View Switcher */}
        <div class="card bg-base-100 border border-base-300 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="avatar placeholder">
              <div class="w-14 rounded-full bg-primary text-primary-content font-bold text-xl">
                <span>{name[0]?.toUpperCase()}</span>
              </div>
            </div>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-base-content">{name}</h1>
              <p class="text-sm text-base-content/60">
                {user.email} · <span class="badge badge-sm badge-outline">{user.role_title}</span>
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <LanguageSwitch currentLocale={locale} size="sm" />
            <a href={backHref} class="btn btn-outline btn-sm">
              {rtl ? "← بازگشت به داشبورد" : "← Back to Dashboard"}
            </a>

            {/* Role-Aware Dashboard Switcher */}
            {isAdmin && (
              from === "admin" ? (
                <a href="/dashboard/user/meets" class="btn btn-secondary btn-sm">
                  {rtl ? "مشاهده نمای کاربری" : "Switch to User View"}
                </a>
              ) : (
                <a href="/dashboard/admin" class="btn btn-primary btn-sm">
                  {rtl ? "مشاهده داشبورد مدیریت" : "Switch to Admin Dashboard"}
                </a>
              )
            )}
          </div>
        </div>

        {/* User Details, Preferred Tags & Password Update Form */}
        <div class="card bg-base-100 border border-base-300 shadow-sm">
          <div class="card-body p-6 sm:p-8">
            <h2 class="card-title text-xl border-b border-base-200 pb-3">
              {rtl ? "اطلاعات حساب کاربری" : "Personal Details"}
            </h2>

            <form class="space-y-6 mt-4" hx-post="/dashboard/account" hx-target="#account-message" hx-swap="innerHTML">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="form-control w-full">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "نام" : "First Name"}
                  </span>
                  <input
                    type="text"
                    name="first_name"
                    value={user.first_name ?? ""}
                    placeholder={rtl ? "نام" : "First Name"}
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>

                <label class="form-control w-full">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "نام خانوادگی" : "Last Name"}
                  </span>
                  <input
                    type="text"
                    name="last_name"
                    value={user.last_name ?? ""}
                    placeholder={rtl ? "نام خانوادگی" : "Last Name"}
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>

                <label class="form-control w-full">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "آدرس ایمیل" : "Email Address"}
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    value={user.email}
                    placeholder="name@example.com"
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>

                <label class="form-control w-full">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "نام کاربری" : "Username"}
                  </span>
                  <input
                    type="text"
                    name="username"
                    value={user.username ?? ""}
                    placeholder="username"
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>

                <label class="form-control w-full sm:col-span-2">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "شماره تماس" : "Phone Number"}
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={user.phone ?? ""}
                    placeholder="+98..."
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>
              </div>

              <div class="divider text-xs uppercase text-base-content/50">
                {rtl ? "موضوعات و برچسب‌های مورد علاقه" : "Preferred Topics & Tags"}
              </div>

              {/* Preferred Tags Selector */}
              <TagSelector
                tags={allTags}
                selectedTagIds={userTagIds}
                name="tagIds"
                locale={locale}
                title={rtl ? "برچسب‌های منتخب شما" : "Your Preferred Tags"}
                subtitle={rtl ? "موضوعات مورد علاقه خود را انتخاب کنید تا جلسات مرتبط به شما پیشنهاد شود:" : "Choose the tags that match your interests to get relevant recommendations:"}
              />

              <div class="divider text-xs uppercase text-base-content/50">
                {rtl ? "تغییر رمز عبور" : "Change Password"}
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="form-control w-full">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "رمز عبور جدید (اختیاری)" : "New Password (optional)"}
                  </span>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>

                <label class="form-control w-full">
                  <span class="label-text font-medium text-xs">
                    {rtl ? "تکرار رمز عبور جدید" : "Confirm New Password"}
                  </span>
                  <input
                    type="password"
                    name="password_confirmation"
                    placeholder="••••••••"
                    class="input input-bordered input-sm sm:input-md w-full"
                  />
                </label>
              </div>

              <div id="account-message"></div>

              <div class="flex items-center justify-between border-t border-base-200 pt-4">
                <button type="submit" class="btn btn-primary btn-sm sm:btn-md">
                  {rtl ? "ذخیره تغییرات" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Logout Section */}
        <div class="card bg-base-100 border border-error/20 shadow-sm">
          <div class="card-body p-6 flex flex-row items-center justify-between">
            <div>
              <h3 class="font-bold text-base text-base-content">
                {rtl ? "مدیریت نشست فعال" : "Session Management"}
              </h3>
              <p class="text-xs text-base-content/60">
                {rtl ? "خروج از حساب کاربری فعلی." : "Terminate your current session."}
              </p>
            </div>
            <form hx-post="/auth/logout">
              <button class="btn btn-error btn-outline btn-sm" type="submit">
                {rtl ? "خروج از حساب" : "Log Out"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
