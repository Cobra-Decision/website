import type { Tag } from "../events/types";

export function TelegramConnectView({
  telegramId,
  telegramUsername,
  telegramName,
  tags,
  error,
}: {
  telegramId: string;
  telegramUsername?: string;
  telegramName: string;
  tags: Tag[];
  error?: string;
}) {
  return (
    <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-base-200 text-base-content" x-data="{ tab: 'link' }">
      <div class="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div class="card-body p-6 space-y-4">
          {/* Header */}
          <div class="text-center space-y-2">
            <div class="w-16 h-16 bg-primary/10 text-primary rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl shadow-inner">
              🐍
            </div>
            <h1 class="text-xl font-bold">Connect CobraDecision</h1>
            <p class="text-xs text-base-content/70">
              Welcome, <span class="font-semibold text-primary">{telegramName}</span>
              {telegramUsername ? ` (@${telegramUsername})` : ""}! Connect your account to manage meetings and RSVPs directly in Telegram.
            </p>
          </div>

          {error && (
            <div class="alert alert-error text-sm py-2 px-3">
              <span>{error}</span>
            </div>
          )}

          {/* Tabs */}
          <div class="tabs tabs-boxed grid grid-cols-2 p-1 bg-base-200">
            <button
              type="button"
              class="tab text-xs sm:text-sm transition-all"
              x-bind:class="{ 'tab-active': tab === 'link' }"
              x-on:click="tab = 'link'"
            >
              Existing Account
            </button>
            <button
              type="button"
              class="tab text-xs sm:text-sm transition-all"
              x-bind:class="{ 'tab-active': tab === 'register' }"
              x-on:click="tab = 'register'"
            >
              New Account
            </button>
          </div>

          {/* Tab 1: Link Existing Account */}
          <div x-show="tab === 'link'" class="space-y-3">
            <form hx-post="/tg/link-account" hx-target="#tg-result" hx-swap="innerHTML" class="space-y-3">
              <input type="hidden" name="telegram_id" value={telegramId} />

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Email / Username / Phone</span>
                </label>
                <input
                  type="text"
                  name="identifier"
                  required
                  placeholder="you@example.com"
                  class="input input-bordered input-sm w-full"
                />
              </div>

              <div class="form-control">
                <label class="label py-1">
                  <span class="label-text text-xs">Password</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  class="input input-bordered input-sm w-full"
                />
              </div>

              <button type="submit" class="btn btn-primary btn-sm w-full mt-2">
                <span class="htmx-indicator loading loading-spinner loading-xs"></span>
                Link & Launch Dashboard
              </button>
            </form>
          </div>

          {/* Tab 2: Quick Register with Email & OTP */}
          <div x-show="tab === 'register'" x-cloak class="space-y-3">
            <div id="tg-register-box">
              <form hx-post="/tg/register-otp" hx-target="#tg-register-box" hx-swap="innerHTML" class="space-y-3">
                <input type="hidden" name="telegram_id" value={telegramId} />
                <input type="hidden" name="telegram_name" value={telegramName} />
                <input type="hidden" name="telegram_username" value={telegramUsername || ""} />

                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs">Email Address (for RSVP updates)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="you@example.com"
                    class="input input-bordered input-sm w-full"
                  />
                </div>

                <div class="form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-semibold">Choose at least 3 topics of interest</span>
                  </label>
                  <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-base-200/60 rounded-lg border border-base-300">
                    {tags.map((tag) => (
                      <label class="cursor-pointer label p-1 bg-base-100 rounded border border-base-300 hover:border-primary gap-1">
                        <input type="checkbox" name="tagIds" value={tag.id} class="checkbox checkbox-xs checkbox-primary" />
                        <span class="label-text text-xs">{tag.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-sm w-full mt-2">
                  <span class="htmx-indicator loading loading-spinner loading-xs"></span>
                  Send Verification Code
                </button>
              </form>
            </div>
          </div>

          <div id="tg-result"></div>
        </div>
      </div>
    </div>
  );
}

export function TelegramOtpForm({
  email,
  telegramId,
}: {
  email: string;
  telegramId: string;
}) {
  return (
    <div class="space-y-3 animate-fade-in text-start">
      <div class="space-y-1">
        <h4 class="font-bold text-sm">Enter Verification Code</h4>
        <p class="text-xs text-base-content/70">
          We sent a 6-digit code to <span class="font-semibold text-primary">{email}</span>.
        </p>
      </div>
      <form hx-post="/tg/verify-otp" hx-target="#tg-result" hx-swap="innerHTML" class="space-y-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="telegram_id" value={telegramId} />
        <div class="form-control">
          <input
            type="text"
            name="otp"
            required
            maxlength={6}
            pattern="[0-9]{6}"
            placeholder="123456"
            class="input input-bordered input-primary w-full text-center text-xl font-mono tracking-widest"
            autofocus
          />
        </div>
        <button class="btn btn-primary btn-sm w-full" type="submit">
          <span class="htmx-indicator loading loading-spinner loading-xs"></span>
          Verify & Launch App
        </button>
      </form>
    </div>
  );
}
