import type { Profile } from "../../auth/views";
import type { Tag } from "../../events/types";
import { TagSelector } from "../../../ui/tag-selector";
import { PhoneInput } from "../../../ui/phone-input";
import type { Locale } from "../../../lib/i18n/translations";
import { t, isRtl } from "../../../lib/i18n/context";
import { LanguageSwitch } from "../../../ui/language-switch";
import { FormField, Input, Button, Badge } from "../../../ui/forms";

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
                <Button type="submit" variant="error" outline size="sm">
                  {t("account.telegram_disconnect_btn", locale)}
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onclick="document.getElementById('modal-telegram-instructions').showModal()"
              >
                {t("account.telegram_connect_btn", locale)}
              </Button>
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
                <Button size="sm" variant="ghost">{t("common.close", locale)}</Button>
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
                {user.email} · <Badge outline size="sm">{user.role_title}</Badge>
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <LanguageSwitch currentLocale={locale} size="sm" />
            <Button href={backHref} outline size="sm">
              {rtl ? "← بازگشت به داشبورد" : "← Back to Dashboard"}
            </Button>

            {/* Role-Aware Dashboard Switcher */}
            {isAdmin && (
              from === "admin" ? (
                <Button href="/dashboard/user/meets" variant="secondary" size="sm">
                  {rtl ? "مشاهده نمای کاربری" : "Switch to User View"}
                </Button>
              ) : (
                <Button href="/dashboard/admin" variant="primary" size="sm">
                  {rtl ? "مشاهده داشبورد مدیریت" : "Switch to Admin Dashboard"}
                </Button>
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
                <FormField label={rtl ? "نام" : "First Name"}>
                  <Input
                    name="first_name"
                    value={user.first_name ?? ""}
                    placeholder={rtl ? "نام" : "First Name"}
                    size="sm"
                    class="sm:input-md"
                  />
                </FormField>

                <FormField label={rtl ? "نام خانوادگی" : "Last Name"}>
                  <Input
                    name="last_name"
                    value={user.last_name ?? ""}
                    placeholder={rtl ? "نام خانوادگی" : "Last Name"}
                    size="sm"
                    class="sm:input-md"
                  />
                </FormField>

                <FormField label={rtl ? "نام کاربری" : "Username"}>
                  <Input
                    name="username"
                    value={user.username ?? ""}
                    placeholder="username"
                    size="sm"
                    class="sm:input-md"
                  />
                </FormField>

                <FormField label={rtl ? "آدرس ایمیل" : "Email Address"} required>
                  <Input
                    type="email"
                    name="email"
                    required
                    value={user.email}
                    placeholder="name@example.com"
                    size="sm"
                    class="sm:input-md"
                  />
                </FormField>

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
                <FormField label={rtl ? "رمز عبور جدید (اختیاری)" : "New Password (optional)"}>
                  <Input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    size="sm"
                    class="sm:input-md"
                  />
                </FormField>

                <FormField label={rtl ? "تکرار رمز عبور جدید" : "Confirm New Password"}>
                  <Input
                    type="password"
                    name="password_confirmation"
                    placeholder="••••••••"
                    size="sm"
                    class="sm:input-md"
                  />
                </FormField>
              </div>

              <div id="account-message"></div>

              <div class="flex items-center justify-between border-t border-base-200 pt-4">
                <Button type="submit" variant="primary" size="sm" class="sm:btn-md">
                  {rtl ? "ذخیره تغییرات" : "Save Changes"}
                </Button>
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
              <Button type="submit" outline size="sm">
                {rtl ? "خروج از حساب" : "Log Out"}
              </Button>
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
              <Button
                type="button"
                variant="error"
                size="sm"
                class="shrink-0"
                onclick="document.getElementById('modal-delete-account').showModal()"
              >
                {t("account.delete_account_btn", locale)}
              </Button>
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
                  <FormField label={t("account.delete_modal_password", locale)} required>
                    <Input
                      type="password"
                      name="password"
                      required
                      placeholder="••••••••"
                      variant="error"
                      size="sm"
                    />
                  </FormField>

                  <div id="delete-account-error"></div>

                  <div class="modal-action flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onclick="document.getElementById('modal-delete-account').close()"
                    >
                      {t("common.cancel", locale)}
                    </Button>
                    <Button type="submit" size="sm" variant="error" htmxIndicator>
                      {t("account.delete_modal_btn", locale)}
                    </Button>
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
