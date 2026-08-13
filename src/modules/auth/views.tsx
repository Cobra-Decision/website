const Captcha = () => (
  <div class="rounded-box border border-base-300 bg-base-200 p-3">
    <altcha-widget challenge="/auth/altcha/challenge"></altcha-widget>
  </div>
);

const Field = ({ label, name, type = "text", required = false }: {
  label: string; name: string; type?: string; required?: boolean;
}) => (
  <label class="form-control w-full">
    <span class="label"><span class="label-text font-medium">{label}</span>{!required && <span class="label-text-alt">Optional</span>}</span>
    <input class="input input-bordered w-full focus:input-primary" name={name} type={type} required={required} autocomplete={name} />
  </label>
);

const AuthCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: any }) => (
  <main class="grid min-h-screen place-items-center px-4 py-10">
    <div class="card w-full max-w-lg border border-base-300 bg-base-100 shadow-2xl">
      <div class="card-body gap-6 p-6 sm:p-10">
        <div><a class="text-sm font-semibold text-primary" href="/">Website</a><h1 class="mt-2 text-3xl font-bold">{title}</h1><p class="mt-2 text-base-content/60">{subtitle}</p></div>
        {children}
      </div>
    </div>
  </main>
);

export const Login = () => (
  <AuthCard title="Welcome back" subtitle="Sign in with your email, username, or phone.">
    <form class="space-y-4" hx-post="/auth/login" hx-target="#auth-result" hx-swap="innerHTML">
      <Field label="Email, username, or phone" name="identifier" required />
      <Field label="Password" name="password" type="password" required />
      <Captcha />
      <div id="auth-result"></div>
      <button class="btn btn-primary w-full" type="submit"><span class="htmx-indicator loading loading-spinner loading-sm"></span>Sign in</button>
    </form>
    <p class="text-center text-sm">New here? <a class="link link-primary font-medium" href="/auth/register">Create an account</a></p>
  </AuthCard>
);

export const Register = () => (
  <AuthCard title="Create your account" subtitle="Start with email and password. Complete your profile now or later.">
    <form class="space-y-4" hx-post="/auth/register" hx-target="#auth-result" hx-swap="innerHTML">
      <div class="grid gap-4 sm:grid-cols-2"><Field label="Email" name="email" type="email" required /><Field label="Password" name="password" type="password" required /></div>
      <div class="divider text-xs uppercase text-base-content/50">Profile details</div>
      <div class="grid gap-4 sm:grid-cols-2"><Field label="Username" name="username" /><Field label="Phone" name="phone" /><Field label="First name" name="first_name" /><Field label="Last name" name="last_name" /></div>
      <Captcha />
      <div id="auth-result"></div>
      <button class="btn btn-primary w-full" type="submit"><span class="htmx-indicator loading loading-spinner loading-sm"></span>Create account</button>
    </form>
    <p class="text-center text-sm">Already registered? <a class="link link-primary font-medium" href="/auth">Sign in</a></p>
  </AuthCard>
);

export type Profile = { email: string; username: string | null; phone: string | null; first_name: string | null; last_name: string | null; role_title: string };

export const Dashboard = ({ user }: { user: Profile }) => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.email;
  return <div class="min-h-screen">
    <header class="navbar border-b border-base-300 bg-base-100 px-4 shadow-sm sm:px-8">
      <div class="flex-1"><a class="text-xl font-bold" href="/dashboard">Dashboard</a></div>
      <div class="dropdown dropdown-end" x-data>
        <button class="btn btn-ghost gap-3" tabindex={0}><div class="avatar placeholder"><div class="w-9 rounded-full bg-primary text-primary-content"><span>{name[0]?.toUpperCase()}</span></div></div><span class="hidden text-left sm:block"><span class="block text-sm font-semibold">{name}</span><span class="block text-xs opacity-60">{user.role_title}</span></span></button>
        <div class="card dropdown-content z-10 mt-3 w-72 border border-base-300 bg-base-100 shadow-xl" tabindex={0}><div class="card-body gap-2 p-5"><p class="font-semibold">{name}</p><p class="text-sm text-base-content/60">{user.email}</p>{user.phone && <p class="text-sm text-base-content/60">{user.phone}</p>}<div class="divider my-1"></div><form hx-post="/auth/logout"><button class="btn btn-error btn-outline btn-sm w-full" type="submit">Log out</button></form></div></div>
      </div>
    </header>
    <main class="container mx-auto p-6 sm:p-10"><div class="hero rounded-box bg-base-100 py-16 shadow-sm"><div class="hero-content text-center"><div><h1 class="text-4xl font-bold">Welcome, {name}</h1><p class="mt-3 text-base-content/60">Your account is ready.</p>{user.role_title === "Super Admin" && <a class="btn btn-primary mt-6" href="/dashboard/admin">Open admin dashboard</a>}</div></div></div></main>
  </div>;
};
