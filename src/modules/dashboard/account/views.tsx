import type { Profile } from "../../auth/views";
import type { Tag } from "../../events/types";
import { TagSelector } from "../../../ui/tag-selector";
import { PhoneInput } from "../../../ui/phone-input";
import type { Locale } from "../../../lib/i18n/translations";
import { t, isRtl } from "../../../lib/i18n/context";
import { LanguageSwitch } from "../../../ui/language-switch";

export function TelegramConnectionCard({
  telegramId,
  locale = "en",
}: {
  telegramId?: string | null;
  locale?: Locale;
}) {
  const rtl = isRtl(locale);
  const isConnected = Boolean(telegramId);

  return (
    <div id="telegram-connection-box" class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-6 sm:p-8 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-xl font-bold">
              {t("account.telegram_title", locale)}
            </h2>
            <p class="text-xs text-base-content/70">
              {isConnected
                ? `${t("account.telegram_connected", locale)} (ID: ${telegramId})`
                : t("account.telegram_not_connected", locale)}
            </p>
          </div>

          <div>
            {isConnected ? (
              <form
                hx-post="/dashboard/account/telegram/disconnect"
                hx-target="#telegram-connection-box"
                hx-swap="outerHTML"
                hx-confirm={t("account.telegram_disconnect_confirm", locale)}
              >
                <button type="submit" class="btn btn-outline btn-error btn-sm">
                  {t("account.telegram_disconnect_btn", locale)}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onclick="document.getElementById('modal-telegram-instructions').showModal()"
                class="btn btn-primary btn-sm"
              >
                {t("account.telegram_connect_btn", locale)}
              </button>
            )}
          </div>
        </div>

        {/* Telegram Connect Instructions Modal */}
        <dialog id="modal-telegram-instructions" class="modal modal-bottom sm:modal-middle">
          <div class="modal-box p-6 space-y-4">
            <h3 class="font-bold text-lg text-primary">
              {t("account.telegram_dialog_title", locale)}
            </h3>
            <div class="space-y-2 text-sm text-base-content/80 bg-base-200/60 p-4 rounded-xl border border-base-300">
              <p>{t("account.telegram_step1", locale)}</p>
              <p>{t("account.telegram_step2", locale)}</p>
              <p>{t("account.telegram_step3", locale)}</p>
            </div>
            <div class="modal-action flex justify-end">
              <form method="dialog">
                <button class="btn btn-sm btn-ghost">{t("common.close", locale)}</button>
              </form>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>
    </div>
  );
}

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

                <div class="sm:col-span-2">
                  <PhoneInput
                    initialPhone={user.phone}
                    name="phone"
                    locale={locale}
                    label={rtl ? "شماره تماس" : "Phone Number"}
                    optional={true}
                  />
                </div>
              </div>

              <div class="divider text-xs uppercase text-base-content/50">
                {rtl ? "موضوعات و برچسب‌های مورد علاقه" : "Preferred Topics & Tags"}
              </div>

              {/* Preferred Tags Selector */}
              <TagSelector
                tags={allTags}
                selectedTagIds={userTagIds}
                minRequired={3}
                name="tagIds"
                locale={locale}
                title={rtl ? "برچسب‌های منتخب شما" : "Your Preferred Tags"}
                subtitle={rtl ? "موضوعات مورد علاقه خود را انتخاب کنید تا جلسات مرتبط به شما پیشنهاد شود (حداقل ۳ مورد):" : "Choose at least 3 tags that match your interests to get relevant recommendations:"}
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

        {/* Telegram Integration Card */}
        <TelegramConnectionCard telegramId={user.telegram_id} locale={locale} />

        {/* Logout Section */}
        <div class="card bg-base-100 border border-base-300 shadow-sm">
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
              <button class="btn btn-outline btn-sm" type="submit">
                {rtl ? "خروج از حساب" : "Log Out"}
              </button>
            </form>
          </div>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div class="card bg-base-100 border border-error/30 shadow-sm">
          <div class="card-body p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="space-y-1">
                <h3 class="font-bold text-base text-error">
                  {t("account.delete_account_title", locale)}
                </h3>
                <p class="text-xs text-base-content/70">
                  {t("account.delete_account_desc", locale)}
                </p>
              </div>
              <button
                type="button"
                onclick="document.getElementById('modal-delete-account').showModal()"
                class="btn btn-error btn-sm shrink-0"
              >
                {t("account.delete_account_btn", locale)}
              </button>
            </div>

            {/* Account Delete Confirmation Modal */}
            <dialog id="modal-delete-account" class="modal modal-bottom sm:modal-middle">
              <div class="modal-box p-6 space-y-4 border border-error/30">
                <h3 class="font-bold text-lg text-error">
                  {t("account.delete_modal_title", locale)}
                </h3>
                <p class="text-xs text-error/90 bg-error/10 p-3 rounded-lg">
                  {t("account.delete_modal_warning", locale)}
                </p>

                <form
                  hx-post="/dashboard/account/delete"
                  hx-target="#delete-account-error"
                  hx-swap="innerHTML"
                  class="space-y-4 text-start"
                >
                  <div class="form-control">
                    <label class="label py-1">
                      <span class="label-text text-xs font-semibold">
                        {t("account.delete_modal_password", locale)}
                      </span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="••••••••"
                      class="input input-bordered input-error input-sm w-full"
                    />
                  </div>

                  <div id="delete-account-error"></div>

                  <div class="modal-action flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onclick="document.getElementById('modal-delete-account').close()"
                      class="btn btn-sm btn-ghost"
                    >
                      {t("common.cancel", locale)}
                    </button>
                    <button type="submit" class="btn btn-sm btn-error">
                      <span class="htmx-indicator loading loading-spinner loading-xs"></span>
                      {t("account.delete_modal_btn", locale)}
                    </button>
                  </div>
                </form>
              </div>
              <form method="dialog" class="modal-backdrop">
                <button>close</button>
              </form>
            </dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
